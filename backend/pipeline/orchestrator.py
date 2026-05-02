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

from pipeline.config import config
from pipeline.transcription import TranscriptionEngine, TranscriptionError
from pipeline.keyframe_extraction import KeyframeExtractor, KeyframeExtractionError
from pipeline.summarization import TextSummarizer, SummarizationError
from pipeline.subtitle_generation import SubtitleGenerator, SubtitleError
from pipeline.semantic_chunking import SemanticChunker
from pipeline.knowledge_graph import KnowledgeGraph
from pipeline.vector_store import VectorStore
from pipeline.retrieval_engine import RetrievalEngine

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

            # ── Phase 1: Transcription + Keyframe Extraction ──────────── #
            t0 = time.time()

            if options.get("transcript", True) and self.transcription_engine:
                if progress_callback:
                    progress_callback("Transcribing audio (WhisperX)...", 10)
                transcript = await self._run_transcription(video_path, progress_callback)
                results["transcript"] = transcript
            else:
                transcript = None
                results["transcript"] = None

            if self.keyframe_extractor:
                if progress_callback:
                    progress_callback("Extracting and clustering video frames...", 25)
                keyframe_data = await self._run_keyframe_extraction(
                    video_path, progress_callback, transcript
                )
                results["keyframes"] = keyframe_data
            else:
                keyframe_data = {}
                results["keyframes"] = None

            phase1_time = time.time() - t0
            pipeline_logs["phase1"] = {
                "transcript_segments": len(transcript["segments"]) if transcript else 0,
                "total_frames_at_1fps": keyframe_data.get("total_frames_at_1fps", 0),
                "cluster_k": keyframe_data.get("cluster_k", 0),
                "scene_count": keyframe_data.get("scene_count", 0),
                "keyframes_selected": keyframe_data.get("extracted_count", 0),
                "frame_scores_sample": keyframe_data.get("frame_scores_sample", []),
                "scene_segments": keyframe_data.get("scene_segments", []),
                "timing_sec": round(phase1_time, 2),
            }

            # ── Phase 2: Dual-channel indexing ───────────────────────── #
            if self.semantic_chunker and self.knowledge_graph and self.vector_store and self.retrieval_engine:
                if progress_callback:
                    progress_callback("Building semantic chunks...", 40)
                t1 = time.time()

                video_id = self._derive_video_id(video_path, options)
                index_dir = os.path.join(config.upload_dir, video_id, "index")
                chunks_dir = os.path.join(config.upload_dir, video_id, "chunks")

                semantic_chunks = self.semantic_chunker.chunk_transcript(
                    transcript or {}, video_id
                )
                self.semantic_chunker.save_chunks(semantic_chunks, chunks_dir, video_id)

                if progress_callback:
                    progress_callback("Building knowledge graph (spaCy NER + SVO)...", 52)
                kg = self.knowledge_graph.build_knowledge_graph(semantic_chunks, video_id)
                self.knowledge_graph.save_graph(index_dir, video_id)

                if progress_callback:
                    progress_callback("Building FAISS vector store...", 63)
                self.vector_store.add_chunks(semantic_chunks)
                self.vector_store.save(index_dir, video_id)

                self.retrieval_engine.initialize(
                    self.knowledge_graph, self.vector_store, semantic_chunks
                )

                # KG sample edges for visualisation
                kg_sample_edges: List[Dict] = []
                if self.knowledge_graph.graph:
                    for src, dst, data in list(
                        self.knowledge_graph.graph.edges(data=True)
                    )[:50]:
                        kg_sample_edges.append(
                            {
                                "source": str(src),
                                "target": str(dst),
                                "relation": str(
                                    data.get("predicates", [""])[0]
                                    if data.get("predicates")
                                    else ""
                                ),
                            }
                        )

                kg_nodes = kg.number_of_nodes()
                kg_edges = kg.number_of_edges()
                vs_size = self.vector_store.index.ntotal if self.vector_store.index else 0

                phase2_time = time.time() - t1
                pipeline_logs["phase2"] = {
                    "total_chunks": len(semantic_chunks),
                    "kg_nodes": kg_nodes,
                    "kg_edges": kg_edges,
                    "kg_sample_edges": kg_sample_edges,
                    "vector_index_size": vs_size,
                    "chunk_sizes": [c["token_count"] for c in semantic_chunks],
                    "timing_sec": round(phase2_time, 2),
                }

                results["rag"] = {
                    "video_id": video_id,
                    "num_chunks": len(semantic_chunks),
                    "kg_nodes": kg_nodes,
                    "kg_edges": kg_edges,
                    "vector_index_size": vs_size,
                    "retrieval_ready": True,
                }

                # ── Phase 3: Hybrid retrieval + Summarization ─────────── #
                if progress_callback:
                    progress_callback("Hybrid retrieval → General summary...", 70)
                t2 = time.time()

                summary_length = options.get("summary_length", "medium")
                general_summary = await self._run_summarization_via_retrieval(
                    self.retrieval_engine,
                    topic=None,
                    summary_length=summary_length,
                    progress_callback=progress_callback,
                )
                results["summary"] = general_summary

                topic = options.get("topic") or None
                if topic:
                    if progress_callback:
                        progress_callback(f"Hybrid retrieval → Topic summary: {topic[:30]}...", 80)
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
                pipeline_logs["phase3"] = {
                    "general_query": "summarize main topics, key insights, and important content",
                    "general_retrieved_count": general_summary.get("retrieved_chunk_count", 0),
                    "general_retrieval_scores": general_summary.get("retrieval_scores", []),
                    "general_retrieved_chunks": general_summary.get("retrieved_chunks", []),
                    "topic": topic,
                    "topic_retrieved_count": (
                        results["topic_summary"].get("retrieved_chunk_count", 0)
                        if results["topic_summary"]
                        else 0
                    ),
                    "timing_sec": round(phase3_time, 2),
                }

                # Citations from general retrieval
                results["citations"] = self._build_citations(
                    general_summary.get("retrieval_scores", []),
                    keyframe_data,
                )

            else:
                results["rag"] = None
                results["summary"] = {"summary": "RAG components unavailable.", "key_points": []}
                results["topic_summary"] = None
                results["citations"] = []
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
        try:
            return await self.transcription_engine.transcribe_video(
                video_path, progress_callback
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
            return await self.keyframe_extractor.extract_keyframes(
                video_path, progress_callback, transcript
            )
        except KeyframeExtractionError as e:
            logger.error(f"Keyframe extraction failed: {e}")
            return {}

    async def _run_subtitle_generation(
        self,
        transcript: Optional[Dict[str, Any]],
        format_type: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        try:
            return await self.subtitle_generator.generate_subtitles(
                transcript, format_type, progress_callback
            )
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
    ) -> Dict[str, Any]:
        """Summarise using ONLY hybrid-retrieved chunks — never the full transcript."""
        query = (
            topic
            if topic
            else "summarize the main topics, key insights, and important content"
        )

        try:
            retrieved_chunks = await retrieval_engine.retrieve(query, top_k_final=30)
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

        logger.info(
            f"Sending {len(sorted_chunks)} retrieved chunks "
            f"({len(context_text.split())} words) to Gemini for "
            f"{'topic: ' + topic if topic else 'general'} summary"
        )

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
        topic_hint = (
            f"Topic focus: {topic}" if topic else "No specific topic — summarize the full content."
        )
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

        response = model.generate_content(prompt)
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
    # Citation assembly                                                    #
    # ------------------------------------------------------------------ #

    def _build_citations(
        self,
        retrieval_scores: List[Dict[str, Any]],
        keyframe_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        keyframes = keyframe_data.get("keyframes", []) if keyframe_data else []
        citations: List[Dict[str, Any]] = []

        for item in retrieval_scores[:15]:
            ts = item.get("time_start", 0)
            m, s = divmod(int(ts), 60)
            timestamp_label = f"{m:02d}:{s:02d}"

            kf_timestamp = None
            kf_path = None
            best_dist = float("inf")
            for kf in keyframes:
                dist = abs(kf.get("timestamp", 0) - ts)
                if dist < best_dist and dist <= 2.0:
                    best_dist = dist
                    kf_timestamp = kf.get("timestamp")
                    kf_path = kf.get("frame_path")

            citations.append(
                {
                    "chunk_id": item.get("chunk_id", ""),
                    "timestamp_label": timestamp_label,
                    "time_start_sec": ts,
                    "time_end_sec": item.get("time_end", 0),
                    "relevance_score": item.get("score", 0),
                    "keyframe_timestamp": kf_timestamp,
                    "keyframe_path": kf_path,
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
