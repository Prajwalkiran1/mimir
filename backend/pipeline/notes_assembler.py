"""Phase 4.6: Structured chaptered notes (Markdown).

Pure assembly from artifacts already produced this run (chapter map-summaries,
visual/OCR chunks, citations, KG glossary) — no extra LLM calls, so it's free.
Output is a downloadable `.md`: overall summary → per-chapter sections with
on-screen code blocks + keyframe thumbnails + cited timestamps → glossary.
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def _mmss(seconds: float) -> str:
    seconds = int(max(0.0, float(seconds)))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _frame_url(fp: Optional[str]) -> Optional[str]:
    if not fp:
        return None
    u = fp.replace("\\", "/")
    return u if u.startswith("/") else "/" + u


class NotesAssembler:
    def assemble(
        self,
        video_id: str,
        task_id: str,
        chapters: List[Dict[str, Any]],
        semantic_chunks: List[Dict[str, Any]],
        general_summary: Dict[str, Any],
        citations: List[Dict[str, Any]],
        kg_summary: Dict[str, Any],
        retrieved_keyframes: List[Dict[str, Any]],
        title: Optional[str] = None,
    ) -> str:
        lines: List[str] = [f"# Notes: {title or video_id}", ""]

        # ── Overall summary ──
        summary_text = (general_summary or {}).get("summary", "").strip()
        if summary_text:
            lines += ["## Summary", "", summary_text, ""]
            for kp in (general_summary or {}).get("key_points", []) or []:
                lines.append(f"- {kp}")
            lines.append("")

        visual_chunks = [c for c in (semantic_chunks or []) if c.get("modality") == "visual"]

        # ── Chapters ──
        if chapters:
            lines += ["## Chapters", ""]
            for ch in sorted(chapters, key=lambda c: c.get("index", 0)):
                idx = int(ch.get("index", 0)) + 1
                start = float(ch.get("start_sec", 0.0))
                end = float(ch.get("end_sec", start))
                title_txt = ch.get("title") or f"Chapter {idx}"
                lines.append(f"### {idx}. {title_txt}  ({_mmss(start)}–{_mmss(end)})")
                lines.append("")
                if ch.get("summary"):
                    lines += [ch["summary"].strip(), ""]
                for kp in ch.get("key_points", []) or []:
                    lines.append(f"- {kp}")
                if ch.get("key_points"):
                    lines.append("")

                # On-screen content captured in this chapter's time range.
                ch_visuals = [
                    c for c in visual_chunks
                    if start <= float(c.get("time_start", 0.0)) < end
                ]
                for vc in ch_visuals:
                    text = vc.get("text", "").strip()
                    if text:
                        lines += [f"**On-screen at {_mmss(vc.get('time_start', 0.0))}:**", "", text, ""]
                    url = _frame_url(vc.get("frame_path"))
                    if url:
                        lines += [f"![keyframe {_mmss(vc.get('time_start', 0.0))}]({url})", ""]

                # Cited moments in range.
                cited = [
                    _mmss(c.get("time_start_sec", 0))
                    for c in (citations or [])
                    if start <= float(c.get("time_start_sec", 0)) < end
                ]
                if cited:
                    lines += [f"_Cited moments: {', '.join(cited)}_", ""]
            lines.append("")

        # ── Glossary (top KG entities) ──
        top_entities = (kg_summary or {}).get("top_entities", []) or []
        if top_entities:
            lines += ["## Glossary", ""]
            for ent in top_entities[:15]:
                name = ent[0] if isinstance(ent, (list, tuple)) else str(ent)
                if name and len(str(name)) > 1:
                    lines.append(f"- **{name}**")
            lines.append("")

        return "\n".join(lines).strip() + "\n"

    def save_notes(self, markdown: str, output_dir: str, task_id: str) -> str:
        os.makedirs(output_dir, exist_ok=True)
        path = os.path.join(output_dir, f"{task_id}_notes.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(markdown)
        logger.info(f"Notes written → {path}")
        return path
