"""Pipeline Orchestrator - Coordinates all pipeline phases"""

import os
import uuid
import logging
import re
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
    """Orchestrates the complete video processing pipeline"""
    
    def __init__(self):
        self.device = config.device
        self.transcription_engine = None
        self.keyframe_extractor = None
        self.summarizer = None
        self.subtitle_generator = None
        
        # RAG components
        self.semantic_chunker = None
        self.knowledge_graph = None
        self.vector_store = None
        self.retrieval_engine = None
        
    def initialize_components(self):
        """Initialize all pipeline components"""
        logger.info("Initializing pipeline components...")

        if config.enable_transcription:
            try:
                self.transcription_engine = TranscriptionEngine(self.device)
            except Exception as e:
                logger.warning(f"TranscriptionEngine init failed: {e}")

        if config.enable_keyframes:
            try:
                self.keyframe_extractor = KeyframeExtractor(max_keyframes=10, min_interval=5)
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

        if config.enable_rag:
            try:
                self.semantic_chunker = SemanticChunker()
                self.knowledge_graph = KnowledgeGraph()
                self.vector_store = VectorStore()
                self.retrieval_engine = RetrievalEngine()
            except Exception as e:
                logger.warning(f"RAG components init failed: {e}")

        logger.info("Pipeline components initialized successfully")
    
    async def process_video(
        self, 
        video_path: str, 
        options: Dict[str, Any],
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        """
        Process video through the complete pipeline
        
        Args:
            video_path: Path to the video file
            options: Processing options
            progress_callback: Callback for progress updates
            
        Returns:
            Dictionary containing all processing results
        """
        try:
            if progress_callback:
                progress_callback("Initializing pipeline...", 5)
            
            # Initialize components if not already done
            if not any([self.transcription_engine, self.keyframe_extractor, 
                       self.summarizer, self.subtitle_generator]):
                self.initialize_components()
            
            results = {}
            
            # Phase 1: Transcription
            if options.get('transcript', True) and self.transcription_engine:
                transcript_result = await self._run_transcription(
                    video_path, progress_callback
                )
                results['transcript'] = transcript_result
            else:
                results['transcript'] = None
            
            # Phase 2: Keyframe Extraction
            if options.get('keyframes', False) and self.keyframe_extractor:
                keyframe_result = await self._run_keyframe_extraction(
                    video_path, progress_callback
                )
                results['keyframes'] = keyframe_result
            else:
                results['keyframes'] = None
            
            # Phase 3: Summarization
            if options.get('topic_based', False) and self.summarizer:
                # Topic-based summarization
                summary_result = await self._run_topic_based_summarization(
                    results['transcript'], options.get('topic'), progress_callback
                )
                results['summary'] = summary_result
            elif options.get('summary', True) and self.summarizer:
                # Regular summarization
                summary_result = await self._run_summarization(
                    results['transcript'], options.get('topic'), progress_callback
                )
                results['summary'] = summary_result
            else:
                results['summary'] = None
            
            # Phase 4: RAG Processing (if enabled)
            if options.get('rag', False) and self.semantic_chunker:
                rag_result = await self._run_rag_processing(
                    results['transcript'], video_path, options, progress_callback
                )
                results['rag'] = rag_result
            else:
                results['rag'] = None
            
            # Phase 5: Subtitle Generation
            if options.get('subtitles', True) and self.subtitle_generator:
                subtitle_result = await self._run_subtitle_generation(
                    results['transcript'], options.get('download_format', 'srt'), 
                    progress_callback
                )
                results['subtitles'] = subtitle_result
            else:
                results['subtitles'] = None
            
            if progress_callback:
                progress_callback("Pipeline processing completed!", 100)
            
            return results
            
        except Exception as e:
            logger.error(f"Pipeline processing failed: {str(e)}")
            raise PipelineError(f"Pipeline processing failed: {str(e)}")
    
    async def _run_transcription(
        self, 
        video_path: str, 
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run transcription phase"""
        try:
            return await self.transcription_engine.transcribe_video(
                video_path, progress_callback
            )
        except TranscriptionError as e:
            logger.error(f"Transcription phase failed: {str(e)}")
            raise
    
    async def _run_keyframe_extraction(
        self, 
        video_path: str, 
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run keyframe extraction phase"""
        try:
            return await self.keyframe_extractor.extract_keyframes(
                video_path, progress_callback
            )
        except KeyframeExtractionError as e:
            logger.error(f"Keyframe extraction phase failed: {str(e)}")
            raise
    
    async def _run_topic_based_summarization(
        self, 
        transcript: Optional[Dict[str, Any]], 
        topic: Optional[str],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run topic-based summarization phase"""
        try:
            if progress_callback:
                progress_callback("Running topic-based analysis...", 60)
            
            if not transcript or not topic:
                logger.warning("Topic-based summarization requires both transcript and topic")
                return {
                    "summary": "Topic-based summarization requires both transcript and topic.",
                    "method": "topic_based",
                    "topic": topic,
                    "segments": []
                }
            
            logger.info(f"Running topic-based summarization for topic: {topic}")
            
            # Extract text from transcript
            if isinstance(transcript, dict) and 'segments' in transcript:
                segments = transcript['segments']
                full_text = " ".join([seg.get('text', '') for seg in segments])
            else:
                full_text = str(transcript) if transcript else ""
                segments = []
            
            # Topic-based analysis - find segments most relevant to the topic
            relevant_segments = self._find_topic_relevant_segments(segments, topic)
            
            # Generate topic-focused summary
            topic_summary = self._generate_topic_summary(relevant_segments, topic)
            
            # Apply grammar smoothing and third-person conversion
            topic_summary = self._smooth_grammar(topic_summary)
            topic_summary = self._convert_to_third_person(topic_summary)
            
            if progress_callback:
                progress_callback("Topic-based analysis completed!", 70)
            
            return {
                "summary": topic_summary,
                "method": "topic_based",
                "topic": topic,
                "segments": relevant_segments[:5],  # Return top 5 relevant segments
                "total_segments_analyzed": len(segments),
                "relevant_segments_found": len(relevant_segments)
            }
            
        except Exception as e:
            logger.error(f"Topic-based summarization phase failed: {str(e)}")
            return {
                "summary": f"Topic-based summarization failed: {str(e)}",
                "method": "topic_based",
                "topic": topic,
                "segments": [],
                "error": str(e)
            }
    
    def _find_topic_relevant_segments(self, segments: List[Dict[str, Any]], topic: str) -> List[Dict[str, Any]]:
        """Find segments most relevant to the given topic"""
        if not segments or not topic:
            return []
        
        topic_lower = topic.lower()
        topic_words = topic_lower.split()
        relevant_segments = []
        
        for segment in segments:
            text = segment.get('text', '').lower()
            
            # Calculate relevance score
            relevance_score = 0
            
            # Direct topic mentions
            if topic_lower in text:
                relevance_score += 10
            
            # Individual topic words
            for word in topic_words:
                if len(word) > 3:  # Skip short words
                    word_count = text.count(word)
                    relevance_score += word_count * 2
            
            # Related keywords (common technical terms)
            related_keywords = self._get_related_keywords(topic)
            for keyword in related_keywords:
                if keyword.lower() in text:
                    relevance_score += 3
            
            # Add segment if relevant enough
            if relevance_score >= 2:  # Minimum threshold
                segment_copy = segment.copy()
                segment_copy['relevance_score'] = relevance_score
                relevant_segments.append(segment_copy)
        
        # Sort by relevance score (highest first)
        relevant_segments.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        return relevant_segments
    
    def _get_related_keywords(self, topic: str) -> List[str]:
        """Get related keywords for common topics"""
        topic_lower = topic.lower()
        
        keyword_mapping = {
            'ssh': ['secure shell', 'authentication', 'key', 'server', 'remote', 'login', 'password', 'encryption'],
            'kafka': ['messaging', 'queue', 'partition', 'broker', 'producer', 'consumer', 'stream', 'event'],
            'machine learning': ['ai', 'artificial intelligence', 'model', 'training', 'algorithm', 'data', 'prediction'],
            'docker': ['container', 'image', 'deployment', 'port', 'volume', 'network', 'microservice'],
            'database': ['sql', 'query', 'table', 'index', 'schema', 'migration', 'connection'],
            'security': ['authentication', 'authorization', 'encryption', 'firewall', 'vulnerability', 'attack'],
            'network': ['protocol', 'tcp', 'udp', 'ip', 'routing', 'packet', 'bandwidth'],
            'web': ['http', 'api', 'frontend', 'backend', 'server', 'client', 'request', 'response'],
        }
        
        # Check for partial matches
        for key, keywords in keyword_mapping.items():
            if key in topic_lower or topic_lower in key:
                return keywords
        
        # Default generic keywords
        return ['system', 'process', 'method', 'technique', 'approach', 'solution', 'implementation']
    
    def _generate_topic_summary(self, relevant_segments: List[Dict[str, Any]], topic: str) -> str:
        """Generate a summary focused on the specific topic"""
        if not relevant_segments:
            return f"No relevant content found for topic: {topic}"
        
        # Take the top relevant segments
        top_segments = relevant_segments[:8]
        
        # Combine their text
        combined_text = " ".join([seg.get('text', '') for seg in top_segments])
        
        # Clean the text
        cleaned_text = self._clean_and_reconstruct_text(combined_text)
        
        # Generate extractive summary focused on the topic
        summary = self._generate_extractive_summary(cleaned_text, max_sentences=4)
        
        # Add topic context if summary is too short
        if len(summary) < 50:
            summary = f"Regarding {topic}: {summary}"
        
        return summary
    
    async def _run_summarization(
        self,
        transcript: Optional[Dict[str, Any]],
        topic: Optional[str],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run summarization phase — Gemini primary, extractive fallback"""
        try:
            if progress_callback:
                progress_callback("Generating AI summary...", 45)

            # Extract full text from transcript
            if isinstance(transcript, dict) and 'segments' in transcript:
                full_text = " ".join(seg.get('text', '') for seg in transcript['segments'])
                duration = transcript.get('duration', 0)
                language = transcript.get('language', 'en')
            else:
                full_text = str(transcript) if transcript else ""
                duration = 0
                language = 'en'

            original_word_count = len(full_text.split())

            try:
                result = await self._summarize_with_gemini(full_text, topic)
                if progress_callback:
                    progress_callback("AI summary complete", 55)
                result['original_word_count'] = original_word_count
                result['duration'] = duration
                result['language'] = language
                return result
            except Exception as e:
                logger.warning(f"Gemini summarization failed, falling back to extractive: {e}")
                if progress_callback:
                    progress_callback("Generating summary...", 50)
                extractive = await self.summarizer.generate_summary(
                    transcript, topic, "extractive", progress_callback=progress_callback
                )
                if isinstance(extractive, dict):
                    extractive['summary_type'] = 'extractive'
                    extractive['key_points'] = []
                return extractive

        except SummarizationError as e:
            logger.error(f"Summarization phase failed: {str(e)}")
            raise

    async def _summarize_with_gemini(self, transcript_text: str, topic: Optional[str] = None) -> Dict[str, Any]:
        """Generate summary + key points using Gemini"""
        import google.generativeai as genai

        api_key = config.gemini_api_key or os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash-lite')

        topic_hint = f"Topic focus: {topic}" if topic else "No specific topic — summarize the full content."
        text_slice = transcript_text[:14000]

        prompt = f"""You are summarizing a video transcript. Write clearly and concisely.

{topic_hint}

TRANSCRIPT:
{text_slice}

Respond in exactly this format (no extra text before or after):

SUMMARY:
<3-5 paragraph summary of the video content. Write in third person. Be specific about what is taught or discussed.>

KEY POINTS:
- <key point 1>
- <key point 2>
- <key point 3>
- <key point 4>
- <key point 5>"""

        response = model.generate_content(prompt)
        raw = response.text.strip()

        summary = ""
        key_points = []

        if "SUMMARY:" in raw and "KEY POINTS:" in raw:
            parts = raw.split("KEY POINTS:")
            summary = parts[0].replace("SUMMARY:", "").strip()
            bullets = parts[1].strip().split("\n")
            key_points = [b.lstrip("- •*").strip() for b in bullets if b.strip() and b.strip() not in ("-", "•", "*")]
        else:
            summary = raw
            key_points = []

        return {
            "summary": summary,
            "key_points": key_points,
            "summary_type": "gemini",
            "model": "gemini-2.5-flash-lite",
            "word_count": len(summary.split()),
        }
    
    async def _run_subtitle_generation(
        self, 
        transcript: Optional[Dict[str, Any]], 
        format_type: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run subtitle generation phase"""
        try:
            return await self.subtitle_generator.generate_subtitles(
                transcript, format_type, progress_callback
            )
        except SubtitleError as e:
            logger.error(f"Subtitle generation phase failed: {str(e)}")
            raise
    
    async def _run_rag_processing(
        self, 
        transcript: Optional[Dict[str, Any]], 
        video_path: str,
        options: Dict[str, Any],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Run RAG processing phase"""
        try:
            import os
            import uuid
            
            # Generate video ID from path or use existing
            if options.get('video_id'):
                video_id = options['video_id']
            else:
                # Extract from video path or generate new one
                path_parts = video_path.split(os.sep)
                video_id = path_parts[-2] if len(path_parts) > 1 else f"video_{uuid.uuid4().hex[:8]}"
            
            # Create output directories
            index_dir = os.path.join(config.upload_dir, video_id, "index")
            chunks_dir = os.path.join(config.upload_dir, video_id, "chunks")
            
            if progress_callback:
                progress_callback("Semantic chunking transcript...", 40)
            
            # Phase 1: Semantic Chunking
            semantic_chunks = self.semantic_chunker.chunk_transcript(
                transcript, video_id, progress_callback
            )
            
            # Save chunks
            self.semantic_chunker.save_chunks(semantic_chunks, chunks_dir, video_id)
            
            if progress_callback:
                progress_callback("Building knowledge graph...", 60)
            
            # Phase 2: Knowledge Graph Construction
            kg = self.knowledge_graph.build_knowledge_graph(
                semantic_chunks, video_id, progress_callback
            )
            
            # Save knowledge graph
            self.knowledge_graph.save_graph(index_dir, video_id)
            
            if progress_callback:
                progress_callback("Building vector store...", 80)
            
            # Phase 3: Vector Store Construction
            self.vector_store.add_chunks(semantic_chunks)
            
            # Save vector store
            self.vector_store.save(index_dir, video_id)
            
            if progress_callback:
                progress_callback("Initializing retrieval engine...", 90)
            
            # Phase 4: Retrieval Engine Initialization
            self.retrieval_engine.initialize(
                self.knowledge_graph, self.vector_store, semantic_chunks
            )
            
            if progress_callback:
                progress_callback("Generating semantic summary...", 95)
            
            # Phase 5: Generate RAG Summary
            rag_summary = await self._generate_rag_summary(semantic_chunks, video_id)
            
            if progress_callback:
                progress_callback("RAG processing completed!", 100)
            
            # Return RAG metadata with summary
            return {
                "video_id": video_id,
                "num_chunks": len(semantic_chunks),
                "kg_nodes": kg.number_of_nodes(),
                "kg_edges": kg.number_of_edges(),
                "vector_index_size": self.vector_store.index.ntotal,
                "index_dir": index_dir,
                "chunks_dir": chunks_dir,
                "retrieval_ready": True,
                "summary": rag_summary
            }
            
        except Exception as e:
            logger.error(f"RAG processing phase failed: {str(e)}")
            raise
    
    async def _generate_rag_summary(self, chunks: List[Dict[str, Any]], video_id: str) -> Dict[str, Any]:
        """Generate semantic summary from chunks using chunk re-ranking and Gemini"""
        try:
            # Sort chunks by time
            chunks = sorted(chunks, key=lambda x: x.get("time_start", 0))
            
            logger.info(f"Processing {len(chunks)} chunks for RAG summary generation")
            
            # Step 1: Extract video title from filename or chunks
            video_title = self._extract_video_title(video_id, chunks)
            
            # Step 2: Re-rank and filter chunks by quality
            ranked_chunks = self._rank_chunks_by_quality(chunks)
            
            # Step 3: Select top chunks for summarization
            top_chunks = ranked_chunks[:min(8, len(ranked_chunks))]
            
            logger.info(f"Selected {len(top_chunks)} top chunks for summarization")
            logger.info(f"Video title: {video_title}")
            
            # Step 4: Try Gemini summarization first
            try:
                summary_text = await self._generate_gemini_summary(top_chunks, video_title)
                method = "gemini"
            except Exception as e:
                logger.warning(f"Gemini summarization failed: {str(e)}, falling back to extractive")
                # Fallback to improved extractive summary
                combined_text = " ".join(chunk["text"] for chunk in top_chunks)
                cleaned_text = self._clean_and_reconstruct_text(combined_text)
                summary_text = self._generate_extractive_summary(cleaned_text)
                method = "extractive"
            
            # Step 5: Apply grammar smoothing and third-person conversion
            summary_text = self._smooth_grammar(summary_text)
            summary_text = self._convert_to_third_person(summary_text)
            
            # Final quality check
            if self._is_poor_quality_summary(summary_text):
                logger.warning("Summary quality is poor, using fallback")
                summary_text = self._generate_fallback_summary(top_chunks)
                summary_text = self._smooth_grammar(summary_text)
                method = "fallback"
            
            return {
                "summary": summary_text,
                "method": method,
                "chunks_used": len(top_chunks),
                "total_chunks": len(chunks),
                "word_count": sum(len(chunk["text"].split()) for chunk in top_chunks),
                "video_title": video_title
            }
            
        except Exception as e:
            logger.error(f"RAG summary generation failed: {str(e)}")
            # Return fallback summary
            return {
                "summary": self._generate_fallback_summary(chunks),
                "method": "fallback",
                "chunks_used": len(chunks),
                "word_count": sum(len(chunk["text"].split()) for chunk in chunks),
                "video_title": self._extract_video_title(video_id, chunks)
            }
    
    def _clean_and_reconstruct_text(self, text: str) -> str:
        """Clean and reconstruct text to fix fragmentation issues"""
        import re
        
        # Remove excessive "And" and "So" patterns
        text = re.sub(r'\b(And|So)\b(?=\s+[A-Z])', '', text)  # Remove before capitalized words
        text = re.sub(r'\b(And|So)\b(?=\s+and\b|\s+so\b)', '', text)  # Remove consecutive
        text = re.sub(r'\b(And|So)\b\s*$', '', text)  # Remove at end of sentences
        
        # Fix sentence boundaries
        text = re.sub(r'(\w)\s+And\s+', r'\1. ', text)  # "word And" -> "word. "
        text = re.sub(r'(\w)\s+So\s+', r'\1. ', text)   # "word So" -> "word. "
        
        # Clean up multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common filler patterns
        fillers = [
            r"you know[,.]?", r"right[,.]?\s", r"okay[,.]?\s",
            r"kind of", r"sort of", r"basically", r"actually",
            r"let me (just |)show you", r"what I('m going to| want to) do is",
            r"the fact that", r"in order to", r"due to the fact that"
        ]
        
        for f in fillers:
            text = re.sub(f, " ", text, flags=re.IGNORECASE)
        
        # Ensure proper sentence endings
        text = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', text)
        
        # Clean up again
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _is_poor_quality_summary(self, summary: str) -> bool:
        """Check if summary quality is poor"""
        if len(summary) < 20:
            return True
        
        # Check for excessive repetition
        words = summary.lower().split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # If any word appears more than 30% of the time, it's poor quality
        max_count = max(word_counts.values()) if word_counts else 0
        if max_count > len(words) * 0.3:
            return True
        
        # Check for too many "And" or "So"
        and_so_count = sum(1 for word in words if word in ['and', 'so'])
        if and_so_count > len(words) * 0.2:
            return True
        
        return False
    
    def _rank_chunks_by_quality(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rank chunks by quality for better summarization"""
        chunk_scores = []
        
        for i, chunk in enumerate(chunks):
            text = chunk["text"].strip()
            
            # Skip very short chunks
            if len(text) < 10:
                continue
            
            score = self._calculate_chunk_quality_score(text, i, len(chunks))
            chunk_scores.append((chunk, score))
        
        # Sort by score (highest first)
        chunk_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return just the chunks in ranked order
        return [chunk for chunk, score in chunk_scores]
    
    def _calculate_chunk_quality_score(self, text: str, position: int, total_chunks: int) -> float:
        """Calculate quality score for a chunk"""
        score = 0.0
        words = text.lower().split()
        
        # 1. Length score (prefer medium-length chunks)
        word_count = len(words)
        if 15 <= word_count <= 40:
            score += 2.0
        elif 10 <= word_count <= 50:
            score += 1.0
        elif word_count < 5:
            score -= 1.0
        
        # 2. Position score (beginning and end are often more important)
        if position < total_chunks * 0.2:  # First 20%
            score += 1.5
        elif position > total_chunks * 0.8:  # Last 20%
            score += 1.2
        
        # 3. Content quality score
        # Check for meaningful content indicators
        meaningful_indicators = [
            'important', 'key', 'main', 'primary', 'essential', 'critical',
            'significant', 'major', 'crucial', 'vital', 'fundamental', 'core',
            'conclusion', 'summary', 'finally', 'in conclusion', 'therefore',
            'because', 'since', 'due to', 'result', 'consequence', 'effect',
            'kafka', 'nike', 'video', 'message', 'partition', 'comment',
            'user', 'candidate', 'pattern', 'server', 'service', 'pressure'
        ]
        
        indicator_count = sum(1 for word in words if word in meaningful_indicators)
        score += indicator_count * 0.5
        
        # 4. Sentence structure score
        sentences = re.split(r'[.!?]+', text)
        complete_sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]
        score += len(complete_sentences) * 0.3
        
        # 5. Penalty for poor quality indicators
        poor_indicators = ['and', 'so', 'but', 'or', 'because', 'since', 'while', 'when']
        poor_count = sum(1 for word in words[:5] if word in poor_indicators)  # Check first 5 words
        score -= poor_count * 0.5
        
        # 6. Penalty for excessive repetition
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        max_repetition = max(word_counts.values()) if word_counts else 0
        if max_repetition > len(words) * 0.3:  # More than 30% same word
            score -= 2.0
        
        # 7. Bonus for diverse vocabulary
        unique_words = len(set(words))
        if word_count > 0:
            diversity_ratio = unique_words / word_count
            score += diversity_ratio * 0.5
        
        return score
    
    def _extract_video_title(self, video_id: str, chunks: List[Dict[str, Any]]) -> str:
        """Extract video title from filename or transcript content"""
        try:
            # Try to get title from video path if available
            from models.task_manager import get_task_manager
            task = get_task_manager().get_task(video_id)
            
            if task and task.video_path:
                # Extract from filename
                filename = os.path.basename(task.video_path)
                # Remove extension and clean up
                title = os.path.splitext(filename)[0]
                # Replace common separators with spaces
                title = re.sub(r'[-_]', ' ', title)
                title = re.sub(r'\s+', ' ', title).strip()
                
                # If title looks reasonable, return it
                if len(title) > 3 and len(title) < 100:
                    return title
            
            # Fallback: try to extract from transcript content
            # Look for title-like phrases in the first few chunks
            for chunk in chunks[:3]:
                text = chunk["text"].strip()
                sentences = re.split(r'[.!?]+', text)
                
                for sentence in sentences:
                    sentence = sentence.strip()
                    # Look for sentences that might be titles
                    if (len(sentence) > 10 and len(sentence) < 80 and
                        any(word in sentence.lower() for word in ['welcome', 'hello', 'today', 'video', 'tutorial', 'lesson', 'talk']) and
                        sentence[0].isupper()):
                        return sentence
            
            # Final fallback: use video_id or generic title
            if video_id and len(video_id) > 3:
                return f"Video {video_id[:8]}"
            
            return "Untitled Video"
            
        except Exception as e:
            logger.warning(f"Failed to extract video title: {str(e)}")
            return "Untitled Video"
    
    async def _generate_gemini_summary(self, chunks: List[Dict[str, Any]], video_title: str) -> str:
        """Generate summary using Gemini API with video title context"""
        try:
            # Combine chunks into a coherent text
            combined_text = " ".join(chunk["text"] for chunk in chunks)
            
            # Clean the text
            cleaned_text = self._clean_and_reconstruct_text(combined_text)
            
            # Try to use Gemini if available
            try:
                import google.generativeai as genai
                
                # Check if API key is available
                api_key = os.getenv('GEMINI_API_KEY')
                if not api_key:
                    raise Exception("GEMINI_API_KEY not found")
                
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                
                prompt = f"""
                Please create a concise, coherent summary (150-250 words) of the following video transcript.
                
                VIDEO TITLE: {video_title}
                
                CRITICAL REQUIREMENTS:
                1. Write in THIRD PERSON only (no "you", "your", "I", "we", "my")
                2. Use formal, professional tone throughout
                3. Focus on educational content and concepts, not conversational elements
                4. Remove all conversational filler, personal anecdotes, and tangential examples
                
                Focus on:
                1. Main technical concepts and principles explained
                2. Key procedures and best practices discussed
                3. Important warnings or security considerations
                4. Core educational content relevant to the video title
                
                AVOID:
                1. First/second person pronouns (you, your, I, we, my)
                2. Conversational phrases ("so", "anyway", "you know", "like")
                3. Personal stories or examples unless essential to the concept
                4. Repetitive statements and filler content
                5. Direct address to the viewer
                
                The summary should read like a technical documentation or educational material.
                Transform any conversational content into formal third-person explanations.
                
                TRANSCRIPT:
                {cleaned_text}
                """
                
                response = model.generate_content(prompt)
                summary = response.text.strip()
                
                # Clean up the response
                summary = re.sub(r'\s+', ' ', summary).strip()
                
                if len(summary) > 20:
                    return summary
                else:
                    raise Exception("Gemini response too short")
                    
            except ImportError:
                logger.warning("Google Generative AI library not installed")
                raise Exception("Gemini library not available")
            except Exception as e:
                logger.warning(f"Gemini API call failed: {str(e)}")
                raise e
                
        except Exception as e:
            logger.error(f"Gemini summarization failed: {str(e)}")
            raise e
    
    def _smooth_grammar(self, text: str) -> str:
        """Apply grammar smoothing to improve readability"""
        try:
            if not text or len(text.strip()) < 10:
                return text
            
            text = text.strip()
            
            # 1. Fix common grammar issues
            grammar_fixes = [
                # Fix "let is" -> "let's"
                (r'\blet is\b', "let's"),
                # Fix "it is that" -> "it's that" or remove
                (r'\bit is that\b', "it's that"),
                # Fix "and is" -> "and is" (keep if correct) or "and"
                (r'\band is\b', "and is"),
                # Fix "so the" when redundant
                (r'\bso the\b(?=\s+[a-z])', "the"),
                # Fix "and the" when redundant
                (r'\band the\b(?=\s+[a-z])', "the"),
                # Fix "but then" -> "but"
                (r'\bbut then\b', "but"),
                # Fix "and then" -> "and" or "then" based on context
                (r'\band then\b', "and"),
                # Fix "this is important and" -> "this is important, and"
                (r'\bthis is important and\b', "this is important, and"),
                # Fix "there is a" -> "there is a" (keep) or "there are"
                (r'\bthere is a\b', "there is a"),
                # Fix "the reason for this is" -> "the reason is"
                (r'\bthe reason for this is\b', "the reason is"),
                # Fix "this is so that" -> "this ensures that"
                (r'\bthis is so that\b', "this ensures that"),
                # Fix "in order to" -> "to"
                (r'\bin order to\b', "to"),
                # Fix "due to the fact that" -> "because"
                (r'\bdue to the fact that\b', "because"),
                # Fix "as well as" -> "and"
                (r'\bas well as\b', "and"),
                # Fix "in addition to" -> "plus"
                (r'\bin addition to\b', "plus"),
            ]
            
            for pattern, replacement in grammar_fixes:
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
            
            # 2. Fix sentence structure (minimal changes to avoid breaking names)
            text = re.sub(r'(\w)\s+([.,!?])', r'\1\2', text)    # Fix spacing before punctuation
            text = re.sub(r'\s+', ' ', text)                     # Fix multiple spaces
            
            # 3. Fix capitalization
            sentences = re.split(r'[.!?]+', text)
            fixed_sentences = []
            
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence:
                    # Capitalize first letter
                    sentence = sentence[0].upper() + sentence[1:] if sentence else sentence
                    # Fix common capitalization issues
                    sentence = re.sub(r'\bi\b', 'I', sentence)  # Capitalize standalone 'i'
                    sentence = re.sub(r'\bkafka\b', 'Kafka', sentence)  # Capitalize Kafka
                    sentence = re.sub(r'\bnike\b', 'Nike', sentence)    # Capitalize Nike
                    fixed_sentences.append(sentence)
            
            text = '. '.join(fixed_sentences)
            
            # 4. Fix common spacing issues
            text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single
            text = re.sub(r'\s*([.,!?])', r'\1', text)  # Remove space before punctuation
            text = re.sub(r'([.,!?])\s*([.,!?])', r'\1', text)  # Remove duplicate punctuation
            
            # 5. Fix common fragments
            fragment_fixes = [
                # Fix "And so" at start
                (r'^\s*And so\s+', ''),
                # Fix "So" at start when redundant
                (r'^\s*So\s+(?=[A-Z])', ''),
                # Fix "And" at start when redundant
                (r'^\s*And\s+(?=[A-Z])', ''),
                # Fix "But" at start when redundant
                (r'^\s*But\s+(?=[A-Z])', ''),
            ]
            
            for pattern, replacement in fragment_fixes:
                text = re.sub(pattern, replacement, text)
            
            # 6. Final cleanup
            text = text.strip()
            
            # Ensure it ends with proper punctuation
            if text and text[-1] not in '.!?':
                text += '.'
            
            return text
            
        except Exception as e:
            logger.warning(f"Grammar smoothing failed: {str(e)}")
            return text  # Return original text if smoothing fails
    
    def _convert_to_third_person(self, text: str) -> str:
        """Convert personal references to third-person while keeping tutorial 'you'"""
        try:
            if not text or len(text.strip()) < 10:
                return text
            
            text = text.strip()
            
            # Personal story indicators - patterns that suggest the creator is talking about themselves
            personal_story_patterns = [
                r'\bI had\b',
                r'\bI have\b',
                r'\bI got\b',
                r'\bI found\b',
                r'\bI think\b',
                r'\bI believe\b',
                r'\bI mean\b',
                r'\bI guess\b',
                r'\bI feel\b',
                r'\bI know\b',
                r'\bI remember\b',
                r'\bI experienced\b',
                r'\bI personally\b',
                r'\bIn my experience\b',
                r'\bFrom my perspective\b',
                r'\bPersonally\b',
                r'\bMy experience\b',
                r'\bMy situation\b',
                r'\bMy setup\b',
                r'\bMy internet\b',
                r'\bMy network\b',
                r'\bMy home\b',
                r'\bMy office\b'
            ]
            
            # Check if text contains personal story elements
            is_personal_story = any(re.search(pattern, text, re.IGNORECASE) for pattern in personal_story_patterns)
            
            if is_personal_story:
                # Convert personal stories to third-person
                personal_conversions = [
                    # First-person pronouns in personal contexts
                    (r'\bI\b', 'the speaker'),
                    (r'\bmy\b', 'their'),
                    (r'\bme\b', 'them'),
                    (r'\bI\'m\b', 'they are'),
                    (r'\bI\'ve\b', 'they have'),
                    (r'\bI\'d\b', 'they would'),
                    (r'\bI\'ll\b', 'they will'),
                    
                    # Remove personal conversational filler
                    (r'\bwell,\s*', ''),
                    (r'\banyway,\s*', ''),
                    (r'\byou know,\s*', ''),
                    (r'\bI mean,\s*', ''),
                    (r'\bactually,\s*', ''),
                    (r'\bbasically,\s*', ''),
                    (r'\breally,\s*', ''),
                    (r'\bI guess\b', 'it seems'),
                    (r'\bI think\b', 'it appears'),
                    (r'\bI feel\b', 'it seems'),
                ]
                
                for pattern, replacement in personal_conversions:
                    text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
                
                # Fix common patterns after conversion
                text = re.sub(r'\bthe speaker are\b', 'the speaker is', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker have\b', 'the speaker has', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker will\b', 'the speaker will', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker am\b', 'the speaker is', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker guess\b', 'it seems', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker think\b', 'it appears', text, flags=re.IGNORECASE)
                text = re.sub(r'\bthe speaker feel\b', 'it seems', text, flags=re.IGNORECASE)
            
            else:
                # For tutorial content, keep "you" as it's natural and helpful
                # Only remove excessive conversational filler
                tutorial_cleanups = [
                    # Remove excessive filler but keep helpful "you"
                    (r'\bso,\s*', ''),
                    (r'\bwell,\s*', ''),
                    (r'\banyway,\s*', ''),
                    (r'\blike,\s*', ''),
                    (r'\byou know,\s*', ''),
                    (r'\bI mean,\s*', ''),
                    (r'\bactually,\s*', ''),
                    (r'\bbasically,\s*', ''),
                    (r'\breally,\s*', ''),
                    
                    # Fix repetitive phrases
                    (r'\byou know what I mean\b', ''),
                    (r'\byou know what\b', ''),
                    (r'\bI guess\b', ''),
                    (r'\bI think\b', ''),
                ]
                
                for pattern, replacement in tutorial_cleanups:
                    text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
            
            # Clean up spacing and punctuation
            text = re.sub(r'\s+', ' ', text)
            text = re.sub(r'\s*([.,!?])', r'\1', text)
            
            # Ensure proper capitalization
            sentences = re.split(r'[.!?]+', text)
            fixed_sentences = []
            
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence:
                    # Capitalize first letter
                    sentence = sentence[0].upper() + sentence[1:] if sentence else sentence
                    fixed_sentences.append(sentence)
            
            text = '. '.join(fixed_sentences)
            
            # Final cleanup
            text = text.strip()
            if text and text[-1] not in '.!?':
                text += '.'
            
            return text
            
        except Exception as e:
            logger.warning(f"Selective third-person conversion failed: {str(e)}")
            return text
    
    def _generate_fallback_summary(self, chunks: List[Dict[str, Any]]) -> str:
        """Generate a simple summary from chunks when extractive fails"""
        # Take the first few chunks and create a simple summary
        important_chunks = []
        
        for chunk in chunks[:min(10, len(chunks))]:
            text = chunk["text"].strip()
            if len(text) > 20 and not text.startswith(("And", "So", "But", "Or")):
                important_chunks.append(text)
        
        if not important_chunks:
            # Fallback to any chunks
            important_chunks = [chunk["text"] for chunk in chunks[:5]]
        
        # Create a simple summary
        summary = " ".join(important_chunks[:3])
        
        # Clean it up
        summary = summary[:300] + "..." if len(summary) > 300 else summary
        
        return summary.strip()
    
    def _generate_extractive_summary(self, text: str, max_sentences: int = 5) -> str:
        """Generate extractive summary using improved sentence scoring"""
        try:
            # Split into sentences more carefully
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if len(sentences) <= max_sentences:
                return '. '.join(sentences)
            
            # Filter out incomplete sentences and fragments
            complete_sentences = []
            for sentence in sentences:
                if self._is_complete_sentence(sentence):
                    complete_sentences.append(sentence)
            
            if not complete_sentences:
                # Fallback to original sentences if none are complete
                complete_sentences = sentences[:max_sentences]
            
            # Calculate word frequencies with stop words filtering
            stop_words = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
                'below', 'between', 'among', 'under', 'over', 'above', 'is', 'are', 'was', 'were',
                'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
                'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
                'my', 'your', 'his', 'its', 'our', 'their', 'a', 'an', 'so', 'then', 'there',
                'here', 'now', 'just', 'only', 'very', 'really', 'also', 'too', 'even', 'well'
            }
            
            word_freq = {}
            total_words = 0
            for sentence in complete_sentences:
                words = [w.lower().strip('.,!?;:"()[]{}') for w in sentence.split() if w.strip()]
                total_words += len(words)
                for word in words:
                    if word not in stop_words and len(word) > 2:
                        word_freq[word] = word_freq.get(word, 0) + 1
            
            # Score sentences using multiple criteria
            sentence_scores = []
            for i, sentence in enumerate(complete_sentences):
                words = [w.lower().strip('.,!?;:"()[]{}') for w in sentence.split() if w.strip()]
                
                # 1. Content word score (excluding stop words)
                content_score = sum(word_freq.get(w, 0) for w in words if w not in stop_words)
                
                # 2. Position score (sentences at beginning and end get higher scores)
                position_score = 1.0
                if i < len(complete_sentences) * 0.3:  # First 30%
                    position_score = 1.5
                elif i > len(complete_sentences) * 0.7:  # Last 30%
                    position_score = 1.3
                
                # 3. Length score (prefer medium-length sentences)
                length_score = 1.0
                if 10 <= len(words) <= 25:
                    length_score = 1.2
                elif len(words) < 5:
                    length_score = 0.5
                elif len(words) > 35:
                    length_score = 0.8
                
                # 4. Keyword score (presence of important terms)
                keywords = ['important', 'key', 'main', 'primary', 'essential', 'critical', 
                           'significant', 'major', 'crucial', 'vital', 'fundamental', 'core']
                keyword_score = sum(1 for w in words if w in keywords) * 2
                
                # Combined score
                total_score = (content_score * 0.4 + position_score * 0.2 + 
                              length_score * 0.2 + keyword_score * 0.2)
                
                sentence_scores.append((sentence, total_score, i))
            
            # Get top sentences with position diversity
            sentence_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Select sentences ensuring some positional diversity
            selected_sentences = []
            used_positions = set()
            
            for sentence, score, pos in sentence_scores:
                if len(selected_sentences) >= max_sentences:
                    break
                
                # Add some positional diversity
                if len(selected_sentences) == 0:
                    selected_sentences.append((sentence, pos))
                    used_positions.add(pos)
                elif len(selected_sentences) < max_sentences:
                    # Prefer sentences from different positions
                    position_diversity = all(abs(pos - used_pos) > len(complete_sentences) * 0.2 
                                            for used_pos in used_positions)
                    if position_diversity or len(selected_sentences) >= max_sentences - 1:
                        selected_sentences.append((sentence, pos))
                        used_positions.add(pos)
            
            # Sort by original position and create summary
            selected_sentences.sort(key=lambda x: x[1])
            summary_sentences = [s[0] for s in selected_sentences]
            
            return '. '.join(summary_sentences)
            
        except Exception as e:
            logger.error(f"Extractive summary failed: {str(e)}")
            # Fallback to simple truncation
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()][:max_sentences]
            return '. '.join(sentences)
    
    def _is_complete_sentence(self, sentence: str) -> bool:
        """Check if a sentence is complete and meaningful"""
        sentence = sentence.strip()
        
        # Minimum length check
        if len(sentence) < 8:
            return False
        
        # More lenient start check - allow lowercase if it's a good sentence
        words = sentence.lower().split()
        if len(words) < 3:
            return False
        
        # Avoid obvious fragments that start with certain words
        fragment_starters = ['and', 'so', 'but', 'or', 'because', 'since', 'while', 'when', 
                             'if', 'though', 'although', 'unless', 'until', 'as', 'like']
        
        if words[0] in fragment_starters and len(words) < 6:
            return False
        
        # Should have reasonable word-to-punctuation ratio
        punctuation_count = sum(1 for char in sentence if char in '.,!?;:')
        if punctuation_count > len(words) * 0.4:  # Too much punctuation
            return False
        
        # Check for meaningful content (not just filler words)
        meaningful_words = ['kafka', 'nike', 'video', 'message', 'partition', 'comment', 'user', 
                           'candidate', 'pattern', 'server', 'service', 'pressure', 'random', 
                           'value', 'key', 'event', 'ad', 'media', 'blob', 'live', 'website']
        
        has_meaningful = any(word in meaningful_words for word in words)
        
        # Check for verb patterns
        verb_patterns = ['is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 
                         'does', 'did', 'will', 'can', 'could', 'would', 'should', 'may',
                         'might', 'must', 'get', 'got', 'make', 'made', 'take', 'took',
                         'come', 'came', 'go', 'went', 'see', 'saw', 'know', 'knew',
                         'think', 'thought', 'say', 'said', 'tell', 'told', 'ask',
                         'asked', 'work', 'works', 'worked', 'use', 'used', 'need',
                         'needed', 'want', 'wanted', 'like', 'liked', 'help', 'helped',
                         'launch', 'launches', 'believe', 'overwhelmed', 'common', 'split',
                         'connected', 'watching', 'broken', 'leaves', 'showed', 'subscribed',
                         'read', 'mistake', 'bias', 'messages', 'going', 'handle', 'obvious',
                         'easy', 'randomly', 'append', 'ensure', 'option']
        
        has_verb = any(word in verb_patterns for word in words)
        
        return has_meaningful and has_verb
    
    def get_pipeline_status(self) -> Dict[str, Any]:
        """Get current pipeline status and configuration"""
        return {
            'device': str(self.device),
            'components': {
                'transcription': self.transcription_engine is not None,
                'keyframe_extraction': self.keyframe_extractor is not None,
                'summarization': self.summarizer is not None,
                'subtitle_generation': self.subtitle_generator is not None,
                'rag': self.retrieval_engine is not None
            },
            'configuration': {
                'use_gpu': config.use_gpu,
                'whisper_model': config.whisper_model,
                'enabled_features': {
                    'transcription': config.enable_transcription,
                    'summarization': config.enable_summarization,
                    'subtitles': config.enable_subtitles,
                    'keyframes': config.enable_keyframes,
                    'topic_analysis': config.enable_topic_analysis,
                    'rag': getattr(config, 'enable_rag', False)
                }
            }
        }

class PipelineError(Exception):
    """Custom exception for pipeline errors"""
    pass
