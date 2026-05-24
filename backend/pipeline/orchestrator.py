"""Pipeline Orchestrator - Coordinates all pipeline phases

Architecture (source of truth: cumrag-latest notebook):
  Phase 1 : Transcription (WhisperX) + Keyframe extraction (k-means++ clustering)
  Phase 2 : Dual-channel indexing — Semantic chunks -> Knowledge Graph + FAISS Vector Store
  Phase 3 : Hybrid retrieval (KG + Vector) -> Gemini summarization (retrieved chunks ONLY)
  Phase 4 : Subtitle generation
  Phase 5 : Citation assembly

Two and only two summary outputs:
  results['summary']       — general summary (all main topics)
  results['topic_summary'] — topic-focused summary (only when topic is provided)
Both go through the same hybrid retrieval pipeline before reaching Gemini.
"""

import os
import re
import uuid
import time
import logging
from typing import Optional, Dict, Any, Callable, List
from datetime import datetime
import asyncio

import numpy as np

from pipeline.config import config
from pipeline.transcription import TranscriptionEngine, TranscriptionError
from pipeline.keyframe_extraction import KeyframeExtractor, KeyframeExtractionError
from pipeline.summarization import TextSummarizer, SummarizationError
from pipeline.subtitle_generation import SubtitleGenerator, SubtitleError
from pipeline.semantic_chunking import SemanticChunker
from pipeline.knowledge_graph import KnowledgeGraph
from pipeline.vector_store import VectorStore
from pipeline.retrieval_engine import RetrievalEngine
from pipeline.visual_enrichment import (
    VisualEnricher, detect_visual_reference_moments, CONTENT_LABELS,
)
from pipeline.chapter_segmentation import segment_into_chapters

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """Orchestrates the complete video processing pipeline."""

    LENGTH_PROFILES = {
        "short":  {"paragraphs": "1-2 paragraphs", "kp_count": 3, "kp_label": "3 key points"},
        "medium": {"paragraphs": "3-5 paragraphs", "kp_count": 5, "kp_label": "5 key points"},
        "long":   {"paragraphs": "6-8 paragraphs", "kp_count": 8, "kp_label": "8 key points"},
    }

    def __init__(self):
        self.device = config.device
        self.transcription_engine: Optional[TranscriptionEngine] = None
        self.keyframe_extractor: Optional[KeyframeExtractor] = None
        self.summarizer: Optional[TextSummarizer] = None
        self.subtitle_generator: Optional[SubtitleGenerator] = None
        self.semantic_chunker: Optional[SemanticChunker] = None
        self.knowledge_graph: Optional[KnowledgeGraph] = None
        self.vector_store: Optional[VectorStore] = None
        self.retrieval_engine: Optional[RetrievalEngine] = None
        self.visual_enricher: Optional[VisualEnricher] = None

    def initialize_components(self):
        logger.info("Initializing pipeline components...")

        if config.enable_transcription:
            try:
                self.transcription_engine = TranscriptionEngine(self.device)
            except Exception as e:
                logger.warning(f"TranscriptionEngine init failed: {e}")

        try:
            self.keyframe_extractor = KeyframeExtractor()
        except Exception as e:
            logger.warning(f"KeyframeExtractor init failed: {e}")

        if config.enable_summarization:
            try:
                self.summarizer = TextSummarizer()
            except Exception as e:
                logger.warning(f"TextSummarizer init failed: {e}")

        if config.enable_subtitles:
            try:
                self.subtitle_generator = SubtitleGenerator()
            except Exception as e:
                logger.warning(f"SubtitleGenerator init failed: {e}")

        # RAG components always initialised (they are the core pipeline)
        try:
            self.semantic_chunker = SemanticChunker()
            self.knowledge_graph = KnowledgeGraph()
            self.vector_store = VectorStore()
            self.retrieval_engine = RetrievalEngine()
        except Exception as e:
            logger.warning(f"RAG components init failed: {e}")

        if getattr(config, "enable_visual_enrichment", True):
            try:
                self.visual_enricher = VisualEnricher(
                    ocr_engine=getattr(config, "ocr_engine", "tesseract"),
                    ocr_max_workers=getattr(config, "ocr_max_workers", 4),
                    ocr_min_chars=getattr(config, "ocr_min_chars", 12),
                )
            except Exception as e:
                logger.warning(f"VisualEnricher init failed: {e}")

        logger.info("Pipeline components initialised.")

    # ------------------------------------------------------------------ #
    # Main entry point                                                     #
    # ------------------------------------------------------------------ #

    async def process_video(
        self,
        video_path: str,
        options: Dict[str, Any],
        progress_callback: Optional[Callable[[str, int], None]] = None,
    ) -> Dict[str, Any]:
        try:
            if progress_callback:
                progress_callback("Initializing pipeline...", 5)

            if not any([
                self.transcription_engine, self.keyframe_extractor,
                self.semantic_chunker, self.retrieval_engine,
            ]):
                self.initialize_components()

            results: Dict[str, Any] = {}
            pipeline_logs: Dict[str, Any] = {}
            all_chunks: List[Dict[str, Any]] = []  # transcript+visual chunks, for notes

            # ── Phase 1: Transcription ∥ (Keyframes → CLIP classify → OCR) ── #
            # Branch B (keyframes+visual) runs concurrently with transcription so the
            # CLIP/OCR latency is hidden behind Whisper (which dominates on long videos).
            t0 = time.time()

            if progress_callback:
                progress_callback("Transcribing + extracting/reading keyframes (parallel)...", 10)

            video_id = self._derive_video_id(video_path, options)

            run_transcription = (
                options.get("transcript", True) and self.transcription_engine is not None
            )
            run_keyframes = self.keyframe_extractor is not None

            empty_kf_bundle = {"keyframe_data": {}, "kept_kf": [], "kept_embs": None,
                               "labels": {}, "ocr_by_kf": {}}

            if run_transcription and run_keyframes:
                transcript, kf_bundle = await asyncio.gather(
                    self._run_transcription(video_path, progress_callback),
                    self._run_keyframes_and_classify(video_path, video_id, progress_callback),
                )
            elif run_transcription:
                transcript = await self._run_transcription(video_path, progress_callback)
                kf_bundle = empty_kf_bundle
            elif run_keyframes:
                transcript = None
                kf_bundle = await self._run_keyframes_and_classify(
                    video_path, video_id, progress_callback
                )
            else:
                transcript = None
                kf_bundle = empty_kf_bundle

            keyframe_data = kf_bundle["keyframe_data"]
            kept_kf = kf_bundle["kept_kf"]
            kept_embs = kf_bundle["kept_embs"]
            frame_labels = kf_bundle["labels"]
            ocr_by_kf = kf_bundle["ocr_by_kf"]

            results["transcript"] = transcript
            results["keyframes"] = keyframe_data if keyframe_data else None

            phase1_time = time.time() - t0
            label_counts: Dict[str, int] = {}
            for lbl in (frame_labels or {}).values():
                label_counts[lbl] = label_counts.get(lbl, 0) + 1
            pipeline_logs["phase1"] = {
                "transcript_segments": len(transcript["segments"]) if transcript else 0,
                "total_frames_at_1fps": keyframe_data.get("total_frames_at_1fps", 0),
                "cluster_k": keyframe_data.get("cluster_k", 0),
                "scene_count": keyframe_data.get("scene_count", 0),
                "keyframes_selected": keyframe_data.get("extracted_count", 0),
                "frame_scores_sample": keyframe_data.get("frame_scores_sample", []),
                "scene_segments": keyframe_data.get("scene_segments", []),
                "frame_labels": label_counts,
                "ocr_frames": len(ocr_by_kf or {}),
                "timing_sec": round(phase1_time, 2),
            }

            # ── Phase 2: Dual-channel indexing ───────────────────────── #
            if self.semantic_chunker and self.knowledge_graph and self.vector_store and self.retrieval_engine:
                if progress_callback:
                    progress_callback("Building semantic chunks...", 40)
                t1 = time.time()

                # Reset per-task state so uploads don't bleed into each other
                self.vector_store.reset()
                self.knowledge_graph.reset()

                # video_id was derived in Phase 1
                index_dir = os.path.join(config.upload_dir, video_id, "index")
                chunks_dir = os.path.join(config.upload_dir, video_id, "chunks")

                semantic_chunks = self.semantic_chunker.chunk_transcript(
                    transcript or {}, video_id
                )

                # ── Phase 2.1: merge visual (OCR) chunks built from Phase 1 ──
                # On-screen code/text becomes first-class retrievable chunks + KG nodes.
                visual_chunks = self._build_and_embed_visual_chunks(
                    kept_kf, ocr_by_kf, frame_labels, transcript, video_id
                )
                if visual_chunks:
                    semantic_chunks = sorted(
                        semantic_chunks + visual_chunks,
                        key=lambda c: c.get("time_start", 0.0),
                    )
                    # Re-number + rewire prev/next so vector-store metadata stays consistent.
                    for i, c in enumerate(semantic_chunks):
                        c["chunk_index"] = i
                        c["prev_chunk_id"] = semantic_chunks[i - 1]["chunk_id"] if i > 0 else None
                        c["next_chunk_id"] = (
                            semantic_chunks[i + 1]["chunk_id"] if i < len(semantic_chunks) - 1 else None
                        )

                all_chunks = semantic_chunks  # captured for notes assembly (Phase 4.6)
                try:
                    self.semantic_chunker.save_chunks(semantic_chunks, chunks_dir, video_id)
                except Exception as e:
                    logger.warning(f"save_chunks failed (non-fatal): {e}")

                if progress_callback:
                    progress_callback("Building knowledge graph (spaCy NER + SVO)...", 52)
                kg = self.knowledge_graph.build_knowledge_graph(semantic_chunks, video_id)
                try:
                    self.knowledge_graph.save_graph(index_dir, video_id)
                except Exception as e:
                    logger.warning(f"save_graph failed (non-fatal): {e}")

                if progress_callback:
                    progress_callback("Building FAISS vector store...", 63)
                # Use pre-computed embeddings from SemanticChunker — avoids a second
                # SentenceTransformer pass and eliminates the most common [Errno 22] path.
                self.vector_store.add_chunks(semantic_chunks, compute_embeddings=False)

                # Image channel: add keyframes to the CLIP image index. Reuse the
                # embeddings already computed in Phase 1 for classification (no re-encode).
                keyframes_for_index = (keyframe_data or {}).get("keyframes", []) or []
                for kf in keyframes_for_index:
                    kf.setdefault("video_id", video_id)
                try:
                    if kept_kf and kept_embs is not None:
                        self.vector_store.add_keyframes(kept_kf, precomputed=(kept_kf, kept_embs))
                    else:
                        self.vector_store.add_keyframes(keyframes_for_index)
                except Exception as e:
                    logger.warning(f"add_keyframes failed (non-fatal): {e}")

                try:
                    self.vector_store.save(index_dir, video_id)
                except Exception as e:
                    logger.warning(f"vector_store.save failed (non-fatal): {e}")

                self.retrieval_engine.initialize(
                    self.knowledge_graph, self.vector_store, semantic_chunks
                )

                # KG sample edges for visualisation
                kg_sample_edges: List[Dict] = []
                if self.knowledge_graph.graph:
                    sorted_edges = sorted(
                        self.knowledge_graph.graph.edges(data=True),
                        key=lambda e: e[2].get("weight", 1),
                        reverse=True,
                    )[:40]
                    for src, dst, data in sorted_edges:
                        kg_sample_edges.append(
                            {
                                "source": str(src),
                                "target": str(dst),
                                "relation": str(
                                    data.get("predicates", [""])[0]
                                    if data.get("predicates")
                                    else ""
                                ),
                                "weight": data.get("weight", 1),
                            }
                        )

                kg_nodes = kg.number_of_nodes()
                kg_edges = kg.number_of_edges()
                vs_size = self.vector_store.index.ntotal if self.vector_store.index else 0
                img_size = (
                    self.vector_store.image_index.ntotal
                    if self.vector_store.image_index else 0
                )

                num_visual = sum(1 for c in semantic_chunks if c.get("modality") == "visual")
                num_text = len(semantic_chunks) - num_visual

                # Surface the visual (OCR) chunks for the frontend "On-screen" view.
                results["visual_chunks"] = [
                    {
                        "chunk_id": c["chunk_id"],
                        "time_start": c["time_start"],
                        "time_end": c["time_end"],
                        "keyframe_id": c.get("keyframe_id"),
                        "frame_path": c.get("frame_path"),
                        "label": c.get("label"),
                        "is_referenced": c.get("is_referenced", False),
                        "text": c.get("text", "")[:600],
                    }
                    for c in semantic_chunks if c.get("modality") == "visual"
                ]

                phase2_time = time.time() - t1
                pipeline_logs["phase2"] = {
                    "total_chunks": len(semantic_chunks),
                    "num_text_chunks": num_text,
                    "num_visual_chunks": num_visual,
                    "kg_nodes": kg_nodes,
                    "kg_edges": kg_edges,
                    "kg_sample_edges": kg_sample_edges,
                    "vector_index_size": vs_size,
                    "image_index_size": img_size,
                    "chunk_sizes": [c["token_count"] for c in semantic_chunks],
                    "timing_sec": round(phase2_time, 2),
                }

                results["rag"] = {
                    "video_id": video_id,
                    "index_dir": index_dir,
                    "chunks_dir": chunks_dir,
                    "num_chunks": len(semantic_chunks),
                    "num_text_chunks": num_text,
                    "num_visual_chunks": num_visual,
                    "kg_nodes": kg_nodes,
                    "kg_edges": kg_edges,
                    "vector_index_size": vs_size,
                    "image_index_size": img_size,
                    "retrieval_ready": True,
                }

                # ── Phase 2.3: Unified chapter segmentation (local, no LLM) ──
                results["chapters"] = []
                if getattr(config, "enable_chapters", True):
                    try:
                        duration = (keyframe_data or {}).get("duration") \
                            or (transcript or {}).get("duration", 0)
                        results["chapters"] = segment_into_chapters(
                            semantic_chunks,
                            (keyframe_data or {}).get("scene_segments", []),
                            duration,
                            target_min_sec=getattr(config, "chapter_target_min_sec", 180),
                            target_max_sec=getattr(config, "chapter_target_max_sec", 480),
                        )
                    except Exception as e:
                        logger.warning(f"Chapter segmentation failed (non-fatal): {e}")

                # ── Phase 3: Retrieval + summarisation ─────────────────── #
                if progress_callback:
                    progress_callback("Summarising (map-reduce over chapters)...", 70)
                t2 = time.time()

                summary_length = options.get("summary_length", "medium")
                has_gemini = bool(config.gemini_api_key or os.getenv("GEMINI_API_KEY"))
                use_map_reduce = has_gemini and len(results["chapters"]) >= 2

                # Always run retrieval so citations + retrieved-chunk views work; only run
                # the per-chunk Gemini summary when NOT doing map-reduce (avoids a wasted call).
                general_summary = await self._run_summarization_via_retrieval(
                    self.retrieval_engine,
                    topic=None,
                    summary_length=summary_length,
                    progress_callback=progress_callback,
                    generate=not use_map_reduce,
                )
                if use_map_reduce:
                    try:
                        global_summary, filled_chapters = await self._map_reduce_summary(
                            results["chapters"], semantic_chunks, summary_length
                        )
                        results["chapters"] = filled_chapters
                        general_summary.update({
                            "summary": global_summary.get("summary", ""),
                            "key_points": global_summary.get("key_points", []),
                            "summary_type": "gemini_map_reduce",
                            "model": global_summary.get("model"),
                            "word_count": global_summary.get("word_count", 0),
                            "num_chapters": len(filled_chapters),
                        })
                    except Exception as e:
                        logger.warning(f"Map-reduce summary failed ({e}); falling back to retrieval summary")
                        if not general_summary.get("summary"):
                            general_summary = await self._run_summarization_via_retrieval(
                                self.retrieval_engine, topic=None,
                                summary_length=summary_length, generate=True,
                            )
                results["summary"] = general_summary

                # Persist chapters (titles/summaries now filled) for on-demand reuse + notes.
                try:
                    if results["chapters"]:
                        os.makedirs(index_dir, exist_ok=True)
                        import json as _json
                        with open(os.path.join(index_dir, f"{video_id}_chapters.json"), "w",
                                  encoding="utf-8") as f:
                            _json.dump(results["chapters"], f, indent=2)
                except Exception as e:
                    logger.warning(f"save chapters failed (non-fatal): {e}")

                topic = options.get("topic") or None
                if topic:
                    if progress_callback:
                        progress_callback(f"Hybrid retrieval -> Topic summary: {topic[:30]}...", 80)
                    topic_summary = await self._run_summarization_via_retrieval(
                        self.retrieval_engine,
                        topic=topic,
                        summary_length=summary_length,
                        progress_callback=progress_callback,
                    )
                    results["topic_summary"] = topic_summary
                else:
                    results["topic_summary"] = None

                phase3_time = time.time() - t2
                # Dual-channel coverage stats per channel
                gen_scores = general_summary.get("retrieval_scores", [])
                gen_graph_hits = sum(1 for s in gen_scores if s.get("graph_score", 0) > 0)
                gen_vector_hits = sum(1 for s in gen_scores if s.get("vector_score", 0) > 0)
                gen_both_hits = sum(
                    1 for s in gen_scores
                    if s.get("graph_score", 0) > 0 and s.get("vector_score", 0) > 0
                )
                topic_scores = (
                    results["topic_summary"].get("retrieval_scores", [])
                    if results["topic_summary"] else []
                )
                topic_graph_hits = sum(1 for s in topic_scores if s.get("graph_score", 0) > 0)
                topic_vector_hits = sum(1 for s in topic_scores if s.get("vector_score", 0) > 0)

                pipeline_logs["phase3"] = {
                    "general_query": "summarize main topics, key insights, and important content",
                    "general_retrieved_count": general_summary.get("retrieved_chunk_count", 0),
                    "general_graph_hits": gen_graph_hits,
                    "general_vector_hits": gen_vector_hits,
                    "general_both_hits": gen_both_hits,
                    "general_retrieval_scores": gen_scores,
                    "general_retrieved_chunks": general_summary.get("retrieved_chunks", []),
                    "topic": topic,
                    "topic_retrieved_count": (
                        results["topic_summary"].get("retrieved_chunk_count", 0)
                        if results["topic_summary"] else 0
                    ),
                    "topic_graph_hits": topic_graph_hits,
                    "topic_vector_hits": topic_vector_hits,
                    "timing_sec": round(phase3_time, 2),
                }

                # Image channel: retrieve keyframes most relevant to the query (CLIP),
                # rather than the old timestamp-proximity heuristic.
                query_for_images = topic or "the most important visual moments in the video"
                try:
                    retrieved_keyframes = await self.retrieval_engine.retrieve_keyframes(
                        query_for_images, k=8
                    )
                except Exception as e:
                    logger.warning(f"Keyframe retrieval failed (non-fatal): {e}")
                    retrieved_keyframes = []

                results["retrieved_keyframes"] = retrieved_keyframes
                pipeline_logs["phase3"]["image_query"] = query_for_images
                pipeline_logs["phase3"]["image_retrieved_count"] = len(retrieved_keyframes)

                # Citations from general retrieval — prefer CLIP-retrieved keyframes,
                # fall back to timestamp proximity when the image channel is empty.
                results["citations"] = self._build_citations(
                    general_summary.get("retrieval_scores", []),
                    keyframe_data,
                    retrieved_keyframes=retrieved_keyframes,
                )

            else:
                results["rag"] = None
                results["summary"] = {"summary": "RAG components unavailable.", "key_points": []}
                results["topic_summary"] = None
                results["citations"] = []
                results["chapters"] = []
                results["visual_chunks"] = []
                pipeline_logs["phase2"] = {"error": "RAG components not initialised"}
                pipeline_logs["phase3"] = {"error": "RAG components not initialised"}

            # ── Phase 4: Subtitle generation ─────────────────────────── #
            if options.get("subtitles", True) and self.subtitle_generator:
                if progress_callback:
                    progress_callback("Generating subtitles...", 90)
                subtitle_result = await self._run_subtitle_generation(
                    results["transcript"],
                    options.get("download_format", "srt"),
                    progress_callback,
                )
                results["subtitles"] = subtitle_result
            else:
                results["subtitles"] = None

            # ── Phase 4.5: Chaptered downloadable MP4 + VTT chapters track ──
            results["chaptered_video"] = None
            if results.get("chapters"):
                if progress_callback:
                    progress_callback("Muxing chaptered video...", 94)
                try:
                    results["chaptered_video"] = await self._run_video_muxing(
                        video_path, results, video_id
                    )
                except Exception as e:
                    logger.warning(f"Video muxing failed (non-fatal): {e}")

            # ── Phase 4.6: Structured chaptered notes (.md) ──
            results["notes"] = None
            if results.get("chapters") and all_chunks:
                if progress_callback:
                    progress_callback("Assembling chaptered notes...", 97)
                try:
                    notes_path = await self._run_notes_assembly(
                        video_id, results, all_chunks, os.path.dirname(video_path)
                    )
                    if notes_path:
                        results["notes"] = {"notes_path": notes_path}
                except Exception as e:
                    logger.warning(f"Notes assembly failed (non-fatal): {e}")

            results["pipeline_logs"] = pipeline_logs

            if progress_callback:
                progress_callback("Pipeline complete!", 100)

            return results

        except Exception as e:
            logger.error(f"Pipeline processing failed: {e}")
            raise PipelineError(f"Pipeline processing failed: {e}")

    # ------------------------------------------------------------------ #
    # Phase runners                                                        #
    # ------------------------------------------------------------------ #

    async def _run_transcription(
        self,
        video_path: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        # transcribe_video is sync (CPU/GPU bound). Run in a worker thread so it doesn't
        # block the event loop AND can run concurrently with keyframe extraction.
        try:
            return await asyncio.to_thread(
                self.transcription_engine.transcribe_video,
                video_path,
                progress_callback,
            )
        except TranscriptionError as e:
            logger.error(f"Transcription failed: {e}")
            raise

    async def _run_keyframe_extraction(
        self,
        video_path: str,
        progress_callback: Optional[Callable] = None,
        transcript: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            return await asyncio.to_thread(
                self.keyframe_extractor.extract_keyframes,
                video_path,
                progress_callback,
                transcript,
            )
        except KeyframeExtractionError as e:
            logger.error(f"Keyframe extraction failed: {e}")
            return {}

    async def _run_keyframes_and_classify(
        self,
        video_path: str,
        video_id: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """Phase 1 branch B: extract keyframes → CLIP embed → zero-shot classify → OCR.

        Returns a bundle {keyframe_data, kept_kf, kept_embs, labels, ocr_by_kf}. The
        CLIP+OCR work is offloaded to a thread so it overlaps transcription. Visual
        chunk *building* (which needs the transcript for deixis) happens in Phase 2.1.
        """
        bundle: Dict[str, Any] = {
            "keyframe_data": {}, "kept_kf": [], "kept_embs": None,
            "labels": {}, "ocr_by_kf": {},
        }
        keyframe_data = await self._run_keyframe_extraction(
            video_path, progress_callback, transcript=None
        )
        bundle["keyframe_data"] = keyframe_data or {}

        keyframes = (keyframe_data or {}).get("keyframes", []) or []
        if (
            not keyframes
            or not self.visual_enricher
            or not self.vector_store
            or not getattr(config, "enable_visual_enrichment", True)
        ):
            return bundle

        for kf in keyframes:
            kf.setdefault("video_id", video_id)

        def _embed_classify_ocr():
            kept, embs = self.vector_store.embed_keyframe_images(keyframes)
            if not kept or embs is None:
                return [], None, {}, {}
            labels = self.visual_enricher.classify(kept, embs)
            content = [
                kf for kf in kept
                if labels.get(kf.get("keyframe_id", ""), "unknown") in CONTENT_LABELS
                or labels.get(kf.get("keyframe_id", ""), "unknown") == "unknown"
            ]
            ocr = self.visual_enricher.ocr_frames(content)
            return kept, embs, labels, ocr

        try:
            if progress_callback:
                progress_callback("Reading on-screen text (CLIP filter + OCR)...", 35)
            kept, embs, labels, ocr = await asyncio.to_thread(_embed_classify_ocr)
            bundle.update(
                {"kept_kf": kept, "kept_embs": embs, "labels": labels, "ocr_by_kf": ocr}
            )
        except Exception as e:
            logger.warning(f"Keyframe classify/OCR failed (non-fatal): {e}")
        return bundle

    def _build_and_embed_visual_chunks(
        self,
        kept_kf: List[Dict[str, Any]],
        ocr_by_kf: Dict[str, str],
        frame_labels: Dict[str, str],
        transcript: Optional[Dict[str, Any]],
        video_id: str,
    ) -> List[Dict[str, Any]]:
        """Build visual chunks from OCR text and embed them with the MiniLM model (no 2nd model)."""
        if not self.visual_enricher or not ocr_by_kf or not kept_kf:
            return []
        try:
            deixis = detect_visual_reference_moments(transcript)
            chunks = self.visual_enricher.build_visual_chunks(
                kept_kf, ocr_by_kf, frame_labels or {}, deixis, video_id
            )
            if not chunks:
                return []
            model = getattr(self.semantic_chunker, "model", None)
            if model is None:
                self.semantic_chunker.initialize()
                model = self.semantic_chunker.model
            embs = model.encode(
                [c["text"] for c in chunks], convert_to_numpy=True, show_progress_bar=False
            )
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            embs = embs / norms
            for i, c in enumerate(chunks):
                c["embedding"] = embs[i].tolist()
            return chunks
        except Exception as e:
            logger.warning(f"Visual chunk build/embed failed (non-fatal): {e}")
            return []

    async def _run_video_muxing(
        self, video_path: str, results: Dict[str, Any], video_id: str
    ) -> Optional[Dict[str, str]]:
        """Phase 4.5 runner: write SRT to disk (if present) and mux a chaptered MP4."""
        from pipeline.video_muxing import mux_chaptered_video

        output_dir = os.path.dirname(video_path)
        srt_path = None
        subs = results.get("subtitles")
        if isinstance(subs, dict) and subs.get("subtitles") and subs.get("format") == "srt":
            srt_path = os.path.join(output_dir, "subtitles.srt")
            try:
                with open(srt_path, "w", encoding="utf-8") as f:
                    f.write(subs["subtitles"])
            except Exception as e:
                logger.warning(f"Failed writing subtitles.srt for mux: {e}")
                srt_path = None
        return await asyncio.to_thread(
            mux_chaptered_video, video_path, srt_path,
            results.get("chapters") or [], output_dir, video_id,
        )

    async def _run_notes_assembly(
        self,
        video_id: str,
        results: Dict[str, Any],
        all_chunks: List[Dict[str, Any]],
        output_dir: str,
    ) -> Optional[str]:
        """Phase 4.6 runner: assemble Markdown notes from this run's artifacts (no LLM call)."""
        from pipeline.notes_assembler import NotesAssembler

        kg_summary: Dict[str, Any] = {}
        try:
            if self.knowledge_graph and self.knowledge_graph.graph:
                kg_summary = self.knowledge_graph.get_graph_summary()
        except Exception:
            kg_summary = {}

        na = NotesAssembler()
        md = na.assemble(
            video_id, video_id,
            results.get("chapters") or [],
            all_chunks,
            results.get("summary") or {},
            results.get("citations") or [],
            kg_summary,
            results.get("retrieved_keyframes") or [],
        )
        return await asyncio.to_thread(na.save_notes, md, output_dir, video_id)

    async def _run_subtitle_generation(
        self,
        transcript: Optional[Dict[str, Any]],
        format_type: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        try:
            gen = self.subtitle_generator.generate_subtitles(
                transcript, format_type, progress_callback
            )
            # Support both sync and async subtitle generators
            if asyncio.iscoroutine(gen):
                return await gen
            return gen
        except SubtitleError as e:
            logger.error(f"Subtitle generation failed: {e}")
            raise

    # ------------------------------------------------------------------ #
    # Core: retrieval-based summarisation                                  #
    # ------------------------------------------------------------------ #

    async def _run_summarization_via_retrieval(
        self,
        retrieval_engine: RetrievalEngine,
        topic: Optional[str] = None,
        summary_length: str = "medium",
        progress_callback: Optional[Callable] = None,
        generate: bool = True,
    ) -> Dict[str, Any]:
        """Summarise using ONLY hybrid-retrieved chunks — never the full transcript.

        generate=False runs retrieval only (no Gemini call) and returns an empty
        summary body — used when the caller will fill the summary via map-reduce but
        still needs retrieval_scores/retrieved_chunks for citations and the UI.
        """
        query = (
            topic
            if topic
            else "summarize the main topics, key insights, and important content"
        )

        is_topic_query = bool(topic)
        try:
            retrieved_chunks = await retrieval_engine.retrieve(
                query,
                top_k_final=15 if is_topic_query else 30,
                topic_mode=is_topic_query,
            )
        except Exception as e:
            logger.warning(f"Retrieval failed ({e}); using empty context")
            retrieved_chunks = []

        # Sort by timestamp for coherent context
        sorted_chunks = sorted(
            retrieved_chunks, key=lambda c: c.get("time_start", 0)
        )

        # Strip filler words before sending to Gemini
        filler_re = re.compile(
            r"\b(you know|right|okay|basically|actually|kind of|sort of|I mean)\b[,.]?\s*",
            re.IGNORECASE,
        )
        context_text = " ".join(
            filler_re.sub("", c["text"]).strip() for c in sorted_chunks
        )

        # Dual-channel diagnostics — confirm BOTH KG and vector contributed signal.
        n_graph = sum(1 for c in sorted_chunks if c.get("graph_score", 0) > 0)
        n_vector = sum(1 for c in sorted_chunks if c.get("vector_score", 0) > 0)
        n_both = sum(
            1 for c in sorted_chunks
            if c.get("graph_score", 0) > 0 and c.get("vector_score", 0) > 0
        )
        logger.info(
            f"Sending {len(sorted_chunks)} retrieved chunks "
            f"({len(context_text.split())} words) to Gemini for "
            f"{'topic: ' + topic if topic else 'general'} summary | "
            f"dual-channel coverage: graph={n_graph}, vector={n_vector}, "
            f"both={n_both} of {len(sorted_chunks)}"
        )
        if len(sorted_chunks) > 0 and n_graph == 0:
            logger.warning(
                "Knowledge graph contributed ZERO chunks to the LLM context — "
                "dual-channel constraint degraded to vector-only."
            )

        if not generate:
            # Retrieval-only: the caller (map-reduce) supplies the summary body.
            result = {
                "summary": "",
                "key_points": [],
                "summary_type": "retrieval_only",
                "model": None,
                "word_count": 0,
                "summary_length": summary_length,
            }
        else:
            try:
                result = await self._summarize_with_gemini(context_text, topic, summary_length)
            except Exception as e:
                logger.warning(f"Gemini failed ({e}); extractive fallback")
                fallback_max = {"short": 3, "medium": 5, "long": 9}.get(summary_length, 5)
                fallback_text = self._generate_extractive_summary(
                    context_text, max_sentences=fallback_max
                )
                result = {
                    "summary": fallback_text,
                    "key_points": [],
                    "summary_type": "extractive_fallback",
                    "model": "extractive",
                    "word_count": len(fallback_text.split()),
                    "summary_length": summary_length,
                }

        result["retrieved_chunk_count"] = len(sorted_chunks)
        result["retrieval_scores"] = [
            {
                "chunk_id": c.get("chunk_id", ""),
                "score": round(c.get("final_score", 0), 4),
                "vector_score": round(c.get("vector_score", 0), 4),
                "graph_score": round(c.get("graph_score", 0), 4),
                "time_start": c.get("time_start", 0),
                "time_end": c.get("time_end", 0),
            }
            for c in sorted_chunks
        ]
        result["retrieved_chunks"] = [
            {
                "chunk_id": c.get("chunk_id", ""),
                "text": c.get("text", "")[:250],
                "time_start": c.get("time_start", 0),
                "time_end": c.get("time_end", 0),
                "score": round(c.get("final_score", 0), 4),
            }
            for c in sorted_chunks
        ]
        if topic:
            result["topic"] = topic

        return result

    async def _summarize_with_gemini(
        self,
        transcript_text: str,
        topic: Optional[str] = None,
        summary_length: str = "medium",
    ) -> Dict[str, Any]:
        import google.generativeai as genai

        api_key = config.gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash-lite")

        profile = self.LENGTH_PROFILES.get(summary_length, self.LENGTH_PROFILES["medium"])
        if topic:
            topic_hint = (
                f'IMPORTANT: Summarize ONLY the content related to: "{topic}". '
                f'Do NOT write a general summary. Focus exclusively on what the video says about "{topic}". '
                f"Ignore content that is not directly about this topic."
            )
        else:
            topic_hint = "Summarize the full content broadly, covering all main themes."
        text_slice = transcript_text[:14000]
        bullets_template = "\n".join(
            f"- <key point {i+1}>" for i in range(profile["kp_count"])
        )

        prompt = f"""You are summarizing a video transcript. Write clearly and concisely.

{topic_hint}

TRANSCRIPT:
{text_slice}

Respond in exactly this format (no extra text before or after):

SUMMARY:
<{profile["paragraphs"]} summary of the video content. Write in third person. Be specific about what is taught or discussed.>

KEY POINTS ({profile["kp_label"]}):
{bullets_template}"""

        response = await asyncio.to_thread(model.generate_content, prompt)
        raw = response.text.strip()

        summary = ""
        key_points: List[str] = []

        if "SUMMARY:" in raw and "KEY POINTS" in raw:
            parts = raw.split("KEY POINTS", 1)
            summary = parts[0].replace("SUMMARY:", "").strip()
            bullets_block = parts[1].split("\n", 1)[1] if "\n" in parts[1] else parts[1]
            bullets = bullets_block.strip().split("\n")
            key_points = [
                b.lstrip("- •*").strip()
                for b in bullets
                if b.strip() and b.strip() not in ("-", "•", "*")
            ]
        else:
            summary = raw

        return {
            "summary": summary,
            "key_points": key_points,
            "summary_type": "gemini",
            "model": "gemini-2.5-flash-lite",
            "summary_length": summary_length,
            "word_count": len(summary.split()),
        }

    # ------------------------------------------------------------------ #
    # Hierarchical map-reduce summarisation (long-range coverage)          #
    # ------------------------------------------------------------------ #

    async def _gemini_text(self, prompt: str) -> str:
        """Single Gemini text call. Raises if no API key is configured."""
        import google.generativeai as genai

        api_key = config.gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = await asyncio.to_thread(model.generate_content, prompt)
        return (response.text or "").strip()

    @staticmethod
    def _parse_titled_summary(raw: str):
        """Parse optional TITLE + SUMMARY + KEY POINTS. Returns (title, summary, key_points)."""
        title, summary, kps = "", "", []
        if "TITLE:" in raw:
            title = raw.split("TITLE:", 1)[1].split("\n", 1)[0].strip()
        if "SUMMARY:" in raw and "KEY POINTS" in raw:
            parts = raw.split("KEY POINTS", 1)
            seg = parts[0]
            summary = seg.split("SUMMARY:", 1)[1].strip() if "SUMMARY:" in seg else seg.strip()
            bullets_block = parts[1].split("\n", 1)[1] if "\n" in parts[1] else parts[1]
            kps = [
                b.lstrip("- •*").strip()
                for b in bullets_block.strip().split("\n")
                if b.strip() and b.strip() not in ("-", "•", "*")
            ]
        elif "SUMMARY:" in raw:
            summary = raw.split("SUMMARY:", 1)[1].strip()
        else:
            summary = raw.strip()
        return title, summary, kps

    async def _gemini_chapter_summary(self, text: str, summary_length: str) -> Dict[str, Any]:
        """MAP step: summarise one chapter's chunks (transcript + on-screen text)."""
        text_slice = text[:8000]
        prompt = f"""You are summarizing one section of a video. The text may include
on-screen content marked like "[On-screen code at 42s]" — treat that as what was
shown on screen (e.g. code, slides, diagrams) and incorporate it.

Respond in exactly this format (no extra text):

TITLE: <concise section title, at most 8 words>
SUMMARY: <2-3 sentences, third person, specific about what is taught or shown>
KEY POINTS:
- <point 1>
- <point 2>
- <point 3>

SECTION:
{text_slice}"""
        raw = await self._gemini_text(prompt)
        title, summary, kps = self._parse_titled_summary(raw)
        return {"title": title, "summary": summary, "key_points": kps}

    async def _gemini_reduce_summary(
        self, chapters: List[Dict[str, Any]], summary_length: str
    ) -> Dict[str, Any]:
        """REDUCE step: synthesise chapter summaries into one global summary."""
        profile = self.LENGTH_PROFILES.get(summary_length, self.LENGTH_PROFILES["medium"])
        outline = "\n".join(
            f"- [{c.get('title','')}] {c.get('summary','')}" for c in chapters
        )[:14000]
        bullets_template = "\n".join(f"- <key point {i+1}>" for i in range(profile["kp_count"]))
        prompt = f"""You are writing the overall summary of a video from its chapter summaries.
Capture the through-line and how ideas connect across the WHOLE video, not just one part.

CHAPTER SUMMARIES (in order):
{outline}

Respond in exactly this format (no extra text):

SUMMARY:
<{profile['paragraphs']} summary in third person, covering the full video.>

KEY POINTS ({profile['kp_label']}):
{bullets_template}"""
        raw = await self._gemini_text(prompt)
        _, summary, kps = self._parse_titled_summary(raw)
        return {
            "summary": summary,
            "key_points": kps,
            "summary_type": "gemini_map_reduce",
            "model": "gemini-2.5-flash-lite",
            "summary_length": summary_length,
            "word_count": len(summary.split()),
        }

    async def _map_reduce_summary(
        self,
        chapters: List[Dict[str, Any]],
        semantic_chunks: List[Dict[str, Any]],
        summary_length: str,
    ):
        """MAP per chapter (bounded concurrency) → REDUCE into a global summary.

        Returns (global_summary_dict, chapters_with_titles_and_summaries).
        """
        by_time = sorted(semantic_chunks, key=lambda c: c.get("time_start", 0.0))
        sem = asyncio.Semaphore(max(1, int(getattr(config, "map_reduce_concurrency", 3))))

        async def _map_one(ch: Dict[str, Any]) -> Dict[str, Any]:
            lo = float(ch.get("start_sec", 0.0))
            hi = float(ch.get("end_sec", lo))
            ids = set(ch.get("chunk_ids", []))
            parts = [
                c["text"] for c in by_time
                if (lo <= float(c.get("time_start", 0.0)) < hi) or c.get("chunk_id") in ids
            ]
            text = " ".join(parts).strip()
            default_title = f"Chapter {int(ch.get('index', 0)) + 1}"
            if not text:
                ch.setdefault("title", default_title)
                ch.setdefault("summary", "")
                ch.setdefault("key_points", [])
                return ch
            try:
                async with sem:
                    res = await self._gemini_chapter_summary(text, summary_length)
                ch["title"] = res.get("title") or default_title
                ch["summary"] = res.get("summary", "")
                ch["key_points"] = res.get("key_points", [])
            except Exception as e:
                logger.warning(f"Chapter {ch.get('index')} summary failed: {e}")
                ch.setdefault("title", default_title)
                ch.setdefault("summary", "")
                ch.setdefault("key_points", [])
            return ch

        filled = await asyncio.gather(*[_map_one(ch) for ch in chapters])
        filled = sorted(filled, key=lambda c: c.get("index", 0))
        global_summary = await self._gemini_reduce_summary(filled, summary_length)
        return global_summary, list(filled)

    # ------------------------------------------------------------------ #
    # Citation assembly                                                    #
    # ------------------------------------------------------------------ #

    def _build_citations(
        self,
        retrieval_scores: List[Dict[str, Any]],
        keyframe_data: Dict[str, Any],
        retrieved_keyframes: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        keyframes = keyframe_data.get("keyframes", []) if keyframe_data else []

        # Index CLIP-retrieved keyframes by timestamp so a text chunk can be paired
        # with the visually-relevant frame nearest its time window. Falls back to the
        # full keyframe set (timestamp proximity only) when the image channel is empty.
        clip_kfs = retrieved_keyframes or []
        candidate_kfs = clip_kfs if clip_kfs else keyframes

        citations: List[Dict[str, Any]] = []

        for item in retrieval_scores[:15]:
            ts = item.get("time_start", 0)
            m, s = divmod(int(ts), 60)
            timestamp_label = f"{m:02d}:{s:02d}"

            kf_timestamp = None
            kf_path = None
            kf_image_score = None
            best_dist = float("inf")
            for kf in candidate_kfs:
                dist = abs(kf.get("timestamp", 0) - ts)
                # CLIP-retrieved frames are already relevance-filtered, so allow a
                # wider temporal window for them than the raw 2s proximity gate.
                window = 30.0 if clip_kfs else 2.0
                if dist < best_dist and dist <= window:
                    best_dist = dist
                    kf_timestamp = kf.get("timestamp")
                    kf_path = kf.get("frame_path")
                    kf_image_score = kf.get("image_score")

            citations.append(
                {
                    "chunk_id": item.get("chunk_id", ""),
                    "timestamp_label": timestamp_label,
                    "time_start_sec": ts,
                    "time_end_sec": item.get("time_end", 0),
                    "relevance_score": item.get("score", 0),
                    "keyframe_timestamp": kf_timestamp,
                    "keyframe_path": kf_path,
                    "keyframe_image_score": kf_image_score,
                }
            )

        return citations

    # ------------------------------------------------------------------ #
    # Utility helpers                                                      #
    # ------------------------------------------------------------------ #

    def _derive_video_id(self, video_path: str, options: Dict[str, Any]) -> str:
        if options.get("video_id"):
            return options["video_id"]
        parts = video_path.replace("\\", "/").split("/")
        return parts[-2] if len(parts) > 1 else f"video_{uuid.uuid4().hex[:8]}"

    def _generate_extractive_summary(self, text: str, max_sentences: int = 5) -> str:
        try:
            sentences = re.split(r"[.!?]+", text)
            sentences = [s.strip() for s in sentences if s.strip()]

            if len(sentences) <= max_sentences:
                return ". ".join(sentences)

            stop_words = {
                "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
                "with", "by", "from", "is", "are", "was", "were", "be", "have",
                "has", "had", "do", "does", "did", "will", "would", "could",
                "should", "may", "might", "must", "can", "this", "that", "these",
                "those", "i", "you", "he", "she", "it", "we", "they", "a", "an",
                "so", "then", "there", "here", "now", "just", "only", "very",
                "really", "also", "too", "even", "well",
            }

            word_freq: Dict[str, int] = {}
            for sent in sentences:
                for word in sent.lower().split():
                    w = word.strip(".,!?;:\"()[]{}").strip()
                    if w and w not in stop_words and len(w) > 2:
                        word_freq[w] = word_freq.get(w, 0) + 1

            scored = []
            for i, sent in enumerate(sentences):
                words = [
                    w.strip(".,!?;:\"()[]{}").lower()
                    for w in sent.split()
                ]
                score = sum(word_freq.get(w, 0) for w in words if w not in stop_words)
                if i < len(sentences) * 0.2:
                    score *= 1.4
                elif i > len(sentences) * 0.8:
                    score *= 1.2
                scored.append((sent, score, i))

            scored.sort(key=lambda x: x[1], reverse=True)
            top = sorted(scored[:max_sentences], key=lambda x: x[2])
            return ". ".join(s[0] for s in top)

        except Exception:
            sentences = re.split(r"[.!?]+", text)
            return ". ".join(s.strip() for s in sentences if s.strip())[:max_sentences]

    def _generate_fallback_summary(self, chunks: List[Dict[str, Any]]) -> str:
        important = []
        for chunk in chunks[:10]:
            text = chunk.get("text", "").strip()
            if len(text) > 20 and not text.startswith(("And", "So", "But")):
                important.append(text)
        if not important:
            important = [c.get("text", "") for c in chunks[:5]]
        summary = " ".join(important[:3])
        return (summary[:300] + "...") if len(summary) > 300 else summary.strip()

    def get_pipeline_status(self) -> Dict[str, Any]:
        return {
            "device": str(self.device),
            "components": {
                "transcription": self.transcription_engine is not None,
                "keyframe_extraction": self.keyframe_extractor is not None,
                "summarization": self.summarizer is not None,
                "subtitle_generation": self.subtitle_generator is not None,
                "rag": self.retrieval_engine is not None,
            },
            "configuration": {
                "use_gpu": config.use_gpu,
                "whisper_model": config.whisper_model,
                "enabled_features": {
                    "transcription": config.enable_transcription,
                    "summarization": config.enable_summarization,
                    "subtitles": config.enable_subtitles,
                    "keyframes": config.enable_keyframes,
                    "rag": getattr(config, "enable_rag", True),
                },
            },
        }


class PipelineError(Exception):
    pass
