"""Phase 1B: Visual content enrichment via CLIP frame-filter + local OCR.

Why this exists: when a presenter says "as you can see from the board, this code
solves it," the on-screen code is never spoken and never reaches the transcript —
so the summary is blind to it. A CLIP embedding can *match* a frame to a query but
cannot *read* the code off it. This module reads it: it reuses the CLIP image
embeddings already computed for the vector store's image index to zero-shot classify
each keyframe, OCRs only content frames (code / slide / diagram / equation), and emits
"visual chunks" (text + timestamp) that merge into the transcript chunks so retrieval,
the knowledge graph, and the summary all see the screen.

Free, local, parallel, no rate limit. Designed to run concurrently with transcription
(in `orchestrator` Phase 1) so its latency is hidden behind Whisper.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# OCR backends are optional — degrade gracefully when neither is installed.
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except Exception:
    TESSERACT_AVAILABLE = False

try:
    import easyocr  # noqa: F401
    EASYOCR_AVAILABLE = True
except Exception:
    EASYOCR_AVAILABLE = False


# Zero-shot scene-type prompts (CLIP text tower). Keep CONTENT_LABELS for OCR.
CLASS_PROMPTS: Dict[str, str] = {
    "code": "a screenshot of source code in an editor or terminal",
    "slide": "a presentation slide with text and bullet points",
    "diagram": "a diagram, chart, graph, or architecture figure",
    "equation": "a mathematical equation or formula on screen",
    "talking": "a person talking to the camera, a webcam headshot",
    "scene": "a photograph of a real-world scene or object",
}
CONTENT_LABELS = {"code", "slide", "diagram", "equation"}

# Exophoric / deixis cues: the speaker is pointing at something visual not described in words.
_DEIXIS = re.compile(
    r"\b(as you can see|as you see|you can see|if you (?:look|see)|"
    r"on the (?:board|screen|slide|right|left|diagram)|"
    r"this (?:code|diagram|slide|chart|graph|figure|equation|function|snippet|example)|"
    r"shown (?:here|below|above)|look at|take a look|notice (?:that|the|how)|"
    r"here we (?:have|see|go)|over here|right here|on screen|up here|down here)\b",
    re.IGNORECASE,
)

_CODE_HINTS = re.compile(
    r"(def |class |import |from \w+ import|function |const |let |var |=>|"
    r"public |private |#include|println|System\.|console\.|return |"
    r"</?\w+>|\{\s*$|\bfor\s*\(|\bif\s*\(|;\s*$|::|==|!=|\+=)",
    re.MULTILINE,
)


def detect_visual_reference_moments(transcript: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Scan transcript segments for deixis cues. Returns [{start,end,text,cue}]."""
    if not transcript:
        return []
    segments = transcript.get("segments") or []
    moments: List[Dict[str, Any]] = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        m = _DEIXIS.search(text)
        if m:
            moments.append({
                "start": float(seg.get("start", 0.0)),
                "end": float(seg.get("end", 0.0)),
                "text": text,
                "cue": m.group(0).lower(),
            })
    return moments


def _looks_like_code(text: str) -> bool:
    if not text:
        return False
    hits = len(_CODE_HINTS.findall(text))
    # indentation is a strong signal too
    indented = sum(1 for ln in text.splitlines() if ln[:1] in (" ", "\t") and ln.strip())
    return hits >= 2 or indented >= 3


class VisualEnricher:
    """CLIP zero-shot frame classification + local OCR → visual chunks."""

    def __init__(
        self,
        clip_model=None,
        ocr_engine: str = "tesseract",
        ocr_max_workers: int = 4,
        ocr_min_chars: int = 12,
    ):
        self.clip_model = clip_model
        self.ocr_engine = ocr_engine
        self.ocr_max_workers = max(1, int(ocr_max_workers))
        self.ocr_min_chars = int(ocr_min_chars)
        self._easyocr_reader = None  # lazy

    # ---------------------------------------------------------------- #
    # 1. Zero-shot frame classification (reuses precomputed CLIP embs)  #
    # ---------------------------------------------------------------- #

    def classify(
        self,
        keyframes: List[Dict[str, Any]],
        embeddings: Optional[np.ndarray],
    ) -> Dict[str, str]:
        """Map keyframe_id -> label. Falls back to 'unknown' (treated as content) without CLIP."""
        if not keyframes:
            return {}
        if self.clip_model is None or embeddings is None or len(embeddings) != len(keyframes):
            return {kf.get("keyframe_id", str(i)): "unknown" for i, kf in enumerate(keyframes)}

        labels = list(CLASS_PROMPTS.keys())
        prompts = [CLASS_PROMPTS[l] for l in labels]
        text_emb = self.clip_model.encode(prompts, convert_to_numpy=True).astype(np.float32)
        text_emb /= (np.linalg.norm(text_emb, axis=1, keepdims=True) + 1e-9)

        img = np.asarray(embeddings, dtype=np.float32)
        # embeddings are already L2-normalised by the vector store; normalise defensively.
        img = img / (np.linalg.norm(img, axis=1, keepdims=True) + 1e-9)

        sims = img @ text_emb.T  # [N, n_labels] cosine
        out: Dict[str, str] = {}
        for i, kf in enumerate(keyframes):
            out[kf.get("keyframe_id", str(i))] = labels[int(np.argmax(sims[i]))]
        return out

    # ---------------------------------------------------------------- #
    # 2. Local OCR over the content frames (parallel)                   #
    # ---------------------------------------------------------------- #

    def _ocr_one(self, path: str) -> str:
        if not path or not os.path.exists(path):
            return ""
        try:
            if self.ocr_engine == "easyocr" and EASYOCR_AVAILABLE:
                if self._easyocr_reader is None:
                    self._easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
                lines = self._easyocr_reader.readtext(path, detail=0, paragraph=True)
                return "\n".join(lines).strip()
            if TESSERACT_AVAILABLE:
                return pytesseract.image_to_string(Image.open(path)).strip()
        except Exception as e:
            logger.debug(f"OCR failed for {path}: {e}")
        return ""

    def ocr_frames(self, keyframes: List[Dict[str, Any]]) -> Dict[str, str]:
        """OCR each keyframe in parallel. Returns keyframe_id -> cleaned text."""
        if not keyframes or not (TESSERACT_AVAILABLE or EASYOCR_AVAILABLE):
            if keyframes:
                logger.warning("No OCR backend available (pytesseract/easyocr) — skipping OCR")
            return {}

        from concurrent.futures import ThreadPoolExecutor

        ids = [kf.get("keyframe_id", str(i)) for i, kf in enumerate(keyframes)]
        paths = [kf.get("frame_path") for kf in keyframes]
        results: Dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=self.ocr_max_workers) as ex:
            for kf_id, text in zip(ids, ex.map(self._ocr_one, paths)):
                cleaned = self._clean_ocr(text)
                if len(cleaned) >= self.ocr_min_chars:
                    results[kf_id] = cleaned
        return results

    @staticmethod
    def _clean_ocr(text: str) -> str:
        if not text:
            return ""
        # Collapse runs of blank lines / trailing whitespace; OCR is noisy.
        lines = [ln.rstrip() for ln in text.splitlines()]
        out, blanks = [], 0
        for ln in lines:
            if not ln.strip():
                blanks += 1
                if blanks <= 1:
                    out.append("")
            else:
                blanks = 0
                out.append(ln)
        return "\n".join(out).strip()

    # ---------------------------------------------------------------- #
    # 3. Build visual chunks (embeddings added later by the orchestrator)#
    # ---------------------------------------------------------------- #

    def build_visual_chunks(
        self,
        keyframes: List[Dict[str, Any]],
        ocr_by_kf: Dict[str, str],
        labels: Dict[str, str],
        deixis_moments: List[Dict[str, Any]],
        video_id: str,
    ) -> List[Dict[str, Any]]:
        """Turn OCR'd content frames into chunk dicts (no embedding yet)."""
        chunks: List[Dict[str, Any]] = []
        idx = 0
        for kf in sorted(keyframes, key=lambda k: k.get("timestamp", 0.0)):
            kf_id = kf.get("keyframe_id", "")
            text = ocr_by_kf.get(kf_id)
            if not text:
                continue
            ts = float(kf.get("timestamp", 0.0))
            label = labels.get(kf_id, "unknown")
            referenced = any(abs(m["start"] - ts) <= 8.0 or m["start"] <= ts <= m["end"]
                             for m in deixis_moments)

            body = f"```\n{text}\n```" if _looks_like_code(text) else text
            kind = "code" if (label == "code" or _looks_like_code(text)) else label
            display = f"[On-screen {kind} at {ts:.0f}s]\n{body}"

            chunks.append({
                "chunk_id": f"{video_id}_visual_{idx:04d}",
                "video_id": video_id,
                "text": display,
                "time_start": ts,
                "time_end": ts + 2.0,
                "token_count": len(display.split()),
                "sentence_count": 1,
                "modality": "visual",
                "label": kind,
                "keyframe_id": kf_id,
                "frame_path": kf.get("frame_path"),
                "is_referenced": referenced,
                "prev_chunk_id": None,
                "next_chunk_id": None,
            })
            idx += 1
        return chunks

    # ---------------------------------------------------------------- #
    # Orchestration                                                     #
    # ---------------------------------------------------------------- #

    def enrich(
        self,
        keyframes: List[Dict[str, Any]],
        embeddings: Optional[np.ndarray],
        transcript: Optional[Dict[str, Any]],
        video_id: str,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
        """classify → keep content frames → OCR → build chunks.

        Returns (visual_chunks, labels). Synchronous/CPU-bound — call via asyncio.to_thread.
        """
        if not keyframes:
            return [], {}

        labels = self.classify(keyframes, embeddings)
        content = [
            kf for kf in keyframes
            if labels.get(kf.get("keyframe_id", ""), "unknown") in CONTENT_LABELS
            or labels.get(kf.get("keyframe_id", ""), "unknown") == "unknown"
        ]
        if not content:
            logger.info("Visual enrichment: no content frames after CLIP filter")
            return [], labels

        ocr_by_kf = self.ocr_frames(content)
        deixis = detect_visual_reference_moments(transcript)
        chunks = self.build_visual_chunks(content, ocr_by_kf, labels, deixis, video_id)
        logger.info(
            f"Visual enrichment: {len(keyframes)} keyframes → {len(content)} content frames "
            f"→ {len(chunks)} visual chunks ({len(deixis)} deixis moments)"
        )
        return chunks, labels
