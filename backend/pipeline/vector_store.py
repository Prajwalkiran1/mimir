"""Vector Store for Multimodal Semantic Search using FAISS

Two parallel FAISS IndexFlatIP indexes (L2-normalised vectors = cosine similarity):
  - text index : transcript chunks, MiniLM (all-MiniLM-L6-v2, 384-d)
  - image index: keyframes, CLIP (clip-ViT-B-32, 512-d)

A text query searches the text index directly (MiniLM) and the image index via
CLIP's text tower — the two encoders live in a shared CLIP space for images and
a separate MiniLM space for text, so each modality keeps its strongest encoder.

SemanticChunker pre-computes the MiniLM embeddings; pass compute_embeddings=False
to add_chunks to skip the second encode pass entirely.
"""

import logging
import json
import os
import numpy as np
import faiss
from typing import List, Dict, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class VectorStore:
    """FAISS-based multimodal vector store (text chunks + keyframe images)."""

    def __init__(
        self,
        embedding_dim: int = 384,
        model_name: str = "all-MiniLM-L6-v2",
        index_type: str = "flat",
        clip_model_name: str = "clip-ViT-B-32",
        clip_dim: int = 512,
    ):
        self.embedding_dim = embedding_dim
        self.model_name = model_name
        self.index_type = index_type
        self.model: Optional[SentenceTransformer] = None
        self.index = None
        self.metadata: List[Dict[str, Any]] = []
        self.is_normalized = False

        # Image (CLIP) channel — lazily initialised so text-only flows pay nothing.
        self.clip_model_name = clip_model_name
        self.clip_dim = clip_dim
        self.clip_model: Optional[SentenceTransformer] = None
        self.image_index = None
        self.image_metadata: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------ #
    # Lifecycle helpers                                                    #
    # ------------------------------------------------------------------ #

    def _device(self) -> str:
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def _ensure_model(self):
        if not self.model:
            device = self._device()
            self.model = SentenceTransformer(self.model_name, device=device)
            logger.info(f"Loaded sentence transformer: {self.model_name} on {device}")

    def _ensure_clip(self):
        """Lazy-load the CLIP model shared by image embedding and image-query encoding."""
        if not self.clip_model:
            device = self._device()
            self.clip_model = SentenceTransformer(self.clip_model_name, device=device)
            logger.info(f"Loaded CLIP model: {self.clip_model_name} on {device}")

    def _ensure_index(self):
        if self.index is None:
            self.index = faiss.IndexFlatIP(self.embedding_dim)

    def _ensure_image_index(self):
        if self.image_index is None:
            self.image_index = faiss.IndexFlatIP(self.clip_dim)

    def reset(self):
        """Clear both indexes and metadata for a new task. Keeps loaded models."""
        self.index = faiss.IndexFlatIP(self.embedding_dim)
        self.metadata = []
        self.is_normalized = False
        self.image_index = faiss.IndexFlatIP(self.clip_dim)
        self.image_metadata = []

    def initialize(self):
        """Load text model + create text index (only what's missing)."""
        self._ensure_model()
        self._ensure_index()
        logger.info(f"Vector store initialised (index type: {self.index_type})")

    # ------------------------------------------------------------------ #
    # Core operations                                                      #
    # ------------------------------------------------------------------ #

    def add_chunks(self, chunks: List[Dict[str, Any]], compute_embeddings: bool = True):
        """Add chunks to the store.

        compute_embeddings=False reuses chunk["embedding"] (already produced by
        SemanticChunker) so the SentenceTransformer is not loaded/run again.
        """
        if not chunks:
            return

        self._ensure_index()

        if compute_embeddings:
            self._ensure_model()
            texts = [chunk["text"] for chunk in chunks]
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                batch_size=32,
                show_progress_bar=False,
            )
        else:
            embeddings = np.array(
                [chunk["embedding"] for chunk in chunks], dtype=np.float32
            )

        # L2-normalise → inner product = cosine similarity
        if not self.is_normalized:
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            embeddings = embeddings / norms
            self.is_normalized = True

        if self.index_type == "ivf" and not self.index.is_trained:
            self.index.train(embeddings)

        self.index.add(embeddings)

        for i, chunk in enumerate(chunks):
            meta = {
                "faiss_id": len(self.metadata) + i,
                "chunk_id": chunk["chunk_id"],
                "chunk_index": chunk["chunk_index"],
                "video_id": chunk["video_id"],
                "text": chunk["text"],
                "time_start": float(chunk["time_start"]),
                "time_end": float(chunk["time_end"]),
                "token_count": int(chunk.get("token_count", 0)),
                "sentence_count": int(chunk.get("sentence_count", 0)),
                "prev_chunk": chunks[i - 1]["chunk_id"] if i > 0 else None,
                "next_chunk": chunks[i + 1]["chunk_id"] if i < len(chunks) - 1 else None,
            }
            if "embedding" in chunk:
                meta["embedding"] = (
                    chunk["embedding"]
                    if isinstance(chunk["embedding"], list)
                    else chunk["embedding"].tolist()
                )
            self.metadata.append(meta)

        logger.info(f"Added {len(chunks)} chunks to vector store (total: {len(self.metadata)})")

    # ------------------------------------------------------------------ #
    # Image (CLIP) channel                                                 #
    # ------------------------------------------------------------------ #

    def embed_keyframe_images(
        self, keyframes: List[Dict[str, Any]], batch_size: int = 16
    ) -> Tuple[List[Dict[str, Any]], Optional[np.ndarray]]:
        """Load + CLIP-encode keyframe JPEGs. Returns (readable_keyframes, L2-normalised embeddings).

        Exposed separately so callers (e.g. visual_enrichment's zero-shot classifier)
        can reuse the exact embeddings that go into the image index — no double encode.
        """
        if not keyframes:
            return [], None

        from PIL import Image

        self._ensure_clip()

        images: List["Image.Image"] = []
        kept: List[Dict[str, Any]] = []
        for kf in keyframes:
            path = kf.get("frame_path")
            if not path or not os.path.exists(path):
                continue
            try:
                images.append(Image.open(path).convert("RGB"))
                kept.append(kf)
            except Exception as e:
                logger.warning(f"Skipping unreadable keyframe {path}: {e}")

        if not images:
            logger.warning("embed_keyframe_images: no readable keyframe images")
            return [], None

        embeddings = self.clip_model.encode(
            images,
            convert_to_numpy=True,
            batch_size=batch_size,
            show_progress_bar=False,
        ).astype(np.float32)
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return kept, embeddings / norms

    def add_keyframes(
        self,
        keyframes: List[Dict[str, Any]],
        batch_size: int = 16,
        precomputed: Optional[Tuple[List[Dict[str, Any]], np.ndarray]] = None,
    ):
        """Add keyframes to the image index.

        Pass `precomputed=(kept_keyframes, embeddings)` from `embed_keyframe_images`
        to avoid re-encoding (the enrichment path computes these for classification).
        Missing/unreadable images are skipped, not fatal.
        """
        if not keyframes and not precomputed:
            return

        self._ensure_image_index()

        if precomputed is not None:
            kept, embeddings = precomputed
        else:
            kept, embeddings = self.embed_keyframe_images(keyframes, batch_size)

        if embeddings is None or not kept:
            return

        self.image_index.add(np.asarray(embeddings, dtype=np.float32))

        base = len(self.image_metadata)
        for i, kf in enumerate(kept):
            self.image_metadata.append({
                "image_faiss_id": base + i,
                "keyframe_id": kf.get("keyframe_id", f"kf_{base + i:04d}"),
                "video_id": kf.get("video_id", ""),
                "scene_id": kf.get("scene_id"),
                "cluster_id": kf.get("cluster_id"),
                "timestamp": float(kf.get("timestamp", 0.0)),
                "frame_path": kf.get("frame_path"),
                "description": kf.get("description", ""),
                "informativeness_score": float(kf.get("informativeness_score", 0.0)),
            })

        logger.info(
            f"Added {len(kept)} keyframes to image index (total: {len(self.image_metadata)})"
        )

    def search_images(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        """Retrieve keyframes whose CLIP image embedding is closest to the text query.

        The query is encoded by CLIP's text tower into the shared CLIP space, so a
        plain text query (e.g. "architecture diagram") can surface the matching frame.
        """
        if not self.image_index or self.image_index.ntotal == 0:
            return []

        self._ensure_clip()
        q_emb = self.clip_model.encode([query], convert_to_numpy=True)[0]
        q_emb = q_emb.astype(np.float32).reshape(1, -1)
        q_emb /= np.linalg.norm(q_emb) + 1e-9

        scores, indices = self.image_index.search(q_emb, min(k, self.image_index.ntotal))

        results: List[Dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(self.image_metadata):
                r = self.image_metadata[idx].copy()
                r["image_score"] = float(score)
                results.append(r)
        return results

    def search(
        self,
        query: str,
        k: int = 10,
        expand_temporal: bool = True,
        temporal_window: int = 2,
    ) -> List[Dict[str, Any]]:
        """Semantic search. Loads model on first call if not already loaded."""
        self._ensure_model()
        if not self.index:
            raise RuntimeError("Vector store has no index — call add_chunks first")

        q_emb = self.model.encode([query], convert_to_numpy=True)[0]
        q_emb = q_emb.astype(np.float32).reshape(1, -1)
        q_emb /= np.linalg.norm(q_emb) + 1e-9

        scores, indices = self.index.search(q_emb, min(k, self.index.ntotal))

        results: List[Dict[str, Any]] = []
        seen: set = set()
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(self.metadata):
                result = self.metadata[idx].copy()
                result["vector_score"] = float(score)
                results.append(result)
                seen.add(result["chunk_id"])

        if expand_temporal:
            results.extend(self._expand_temporal(results, temporal_window, seen))

        results.sort(key=lambda x: x["vector_score"], reverse=True)
        return results[:k]

    # ------------------------------------------------------------------ #
    # Save / load                                                          #
    # ------------------------------------------------------------------ #

    def save(self, output_dir: str, video_id: str):
        """Persist FAISS index and chunk metadata to disk."""
        os.makedirs(output_dir, exist_ok=True)

        # FAISS — use forward slashes so the C++ layer is happy on Windows too
        index_path = os.path.join(output_dir, f"{video_id}_vector_store.faiss")
        faiss.write_index(self.index, index_path.replace("\\", "/"))

        # Metadata — strip embeddings to keep the file small
        meta_path = os.path.join(output_dir, f"{video_id}_vector_store_meta.json")
        saveable = [
            {k: v for k, v in m.items() if k != "embedding"}
            for m in self.metadata
        ]
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(saveable, f, indent=2)

        # Image (CLIP) channel — only persisted when keyframes were indexed.
        if self.image_index is not None and self.image_index.ntotal > 0:
            img_index_path = os.path.join(output_dir, f"{video_id}_image_store.faiss")
            faiss.write_index(self.image_index, img_index_path.replace("\\", "/"))
            img_meta_path = os.path.join(output_dir, f"{video_id}_image_store_meta.json")
            with open(img_meta_path, "w", encoding="utf-8") as f:
                json.dump(self.image_metadata, f, indent=2)
            logger.info(f"Saved image index ({self.image_index.ntotal} keyframes) → {img_index_path}")

        logger.info(f"Saved vector store → {index_path}")
        return index_path, meta_path

    @classmethod
    def load(cls, output_dir: str, video_id: str) -> "VectorStore":
        index_path = os.path.join(output_dir, f"{video_id}_vector_store.faiss")
        meta_path = os.path.join(output_dir, f"{video_id}_vector_store_meta.json")

        vs = cls()
        vs._ensure_model()
        vs.index = faiss.read_index(index_path.replace("\\", "/"))
        with open(meta_path, "r", encoding="utf-8") as f:
            vs.metadata = json.load(f)
        vs.is_normalized = True

        # Restore the image channel if it was persisted (CLIP model loaded lazily on search).
        img_index_path = os.path.join(output_dir, f"{video_id}_image_store.faiss")
        img_meta_path = os.path.join(output_dir, f"{video_id}_image_store_meta.json")
        if os.path.exists(img_index_path) and os.path.exists(img_meta_path):
            vs.image_index = faiss.read_index(img_index_path.replace("\\", "/"))
            with open(img_meta_path, "r", encoding="utf-8") as f:
                vs.image_metadata = json.load(f)
            logger.info(f"Loaded image index ({vs.image_index.ntotal} keyframes)")

        logger.info(f"Loaded vector store from {index_path}")
        return vs

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _expand_temporal(
        self,
        results: List[Dict[str, Any]],
        window: int,
        seen: set,
    ) -> List[Dict[str, Any]]:
        extra: List[Dict[str, Any]] = []
        for result in results:
            base_score = result["vector_score"]
            for direction in ("prev_chunk", "next_chunk"):
                cid = result.get(direction)
                for decay in range(1, window + 1):
                    if not cid or cid in seen:
                        break
                    chunk = self._find_by_id(cid)
                    if not chunk:
                        break
                    r = chunk.copy()
                    r["vector_score"] = base_score * (0.8 ** decay)
                    r["context_type"] = direction
                    extra.append(r)
                    seen.add(cid)
                    cid = chunk.get(direction)
        return extra

    def _find_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        for m in self.metadata:
            if m["chunk_id"] == chunk_id:
                return m
        return None

    def get_video_chunks(self, video_id: str) -> List[Dict[str, Any]]:
        return [m for m in self.metadata if m["video_id"] == video_id]
