"""Semantic Chunking for Video Transcripts

Intelligently segments transcripts into meaningful chunks based on:
- Semantic coherence using sentence transformers
- Temporal boundaries (speaker changes, pauses)
- Token count limits
- Topic continuity
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional
import json
import os
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import sent_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

logger = logging.getLogger(__name__)


class SemanticChunker:
    """Intelligent transcript chunking based on semantic coherence"""
    
    def __init__(self, 
                 model_name: str = "all-MiniLM-L6-v2",
                 max_chunk_tokens: int = 512,
                 min_chunk_tokens: int = 50,
                 similarity_threshold: float = 0.3):
        """
        Initialize semantic chunker
        
        Args:
            model_name: Sentence transformer model name
            max_chunk_tokens: Maximum tokens per chunk
            min_chunk_tokens: Minimum tokens per chunk
            similarity_threshold: Minimum similarity for chunk merging
        """
        self.model_name = model_name
        self.max_chunk_tokens = max_chunk_tokens
        self.min_chunk_tokens = min_chunk_tokens
        self.similarity_threshold = similarity_threshold
        self.model = None
        
    def initialize(self):
        """Load the sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded sentence transformer: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer: {e}")
            raise
    
    def chunk_transcript(self, 
                        transcript: Dict[str, Any], 
                        video_id: str,
                        progress_callback: Optional[callable] = None) -> List[Dict[str, Any]]:
        """
        Chunk transcript into semantically coherent segments
        
        Args:
            transcript: Transcript dictionary with segments
            video_id: Video identifier
            progress_callback: Progress callback function
            
        Returns:
            List of chunk dictionaries
        """
        if not self.model:
            self.initialize()
            
        if progress_callback:
            progress_callback("Preparing transcript for chunking...", 10)
        
        # Extract sentences with timestamps
        sentences = self._extract_sentences(transcript)
        
        if progress_callback:
            progress_callback("Computing sentence embeddings...", 30)
        
        # Compute embeddings
        embeddings = self.model.encode(
            [s["text"] for s in sentences],
            convert_to_numpy=True,
            show_progress_bar=False
        )
        
        if progress_callback:
            progress_callback("Performing semantic clustering...", 50)
        
        # Perform semantic clustering
        clusters = self._semantic_clustering(sentences, embeddings)
        
        if progress_callback:
            progress_callback("Creating coherent chunks...", 70)
        
        # Create chunks from clusters
        chunks = self._create_chunks_from_clusters(clusters, video_id)
        
        if progress_callback:
            progress_callback("Finalizing chunks...", 90)
        
        # Apply token limits and merge small chunks
        chunks = self._apply_token_limits(chunks)
        
        if progress_callback:
            progress_callback(f"Created {len(chunks)} semantic chunks", 100)
        
        return chunks
    
    def _extract_sentences(self, transcript: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract individual sentences with timestamps from transcript"""
        sentences = []
        
        if "segments" in transcript:
            for segment in transcript["segments"]:
                segment_text = segment.get("text", "")
                segment_start = segment.get("start", 0)
                
                # Split segment into sentences
                segment_sentences = sent_tokenize(segment_text)
                
                # Distribute time across sentences
                if len(segment_sentences) > 0:
                    segment_duration = segment.get("end", segment_start) - segment_start
                    time_per_sentence = segment_duration / len(segment_sentences)
                    
                    for i, sent in enumerate(segment_sentences):
                        sentences.append({
                            "text": sent.strip(),
                            "time_start": segment_start + (i * time_per_sentence),
                            "time_end": segment_start + ((i + 1) * time_per_sentence),
                            "segment_id": segment.get("id", "")
                        })
        
        return sentences
    
    def _semantic_clustering(self, sentences: List[Dict[str, Any]], embeddings: np.ndarray) -> List[List[Dict[str, Any]]]:
        """Perform semantic clustering on sentences"""
        if len(sentences) <= 1:
            return [sentences]
        
        # Compute similarity matrix
        similarity_matrix = cosine_similarity(embeddings)
        
        # Convert to distance matrix (1 - similarity)
        distance_matrix = 1 - similarity_matrix
        
        # Determine optimal number of clusters
        n_clusters = self._determine_optimal_clusters(similarity_matrix)
        
        # Perform agglomerative clustering
        clustering = AgglomerativeClustering(
            n_clusters=n_clusters,
            metric='precomputed',
            linkage='average'
        )
        
        cluster_labels = clustering.fit_predict(distance_matrix)
        
        # Group sentences by cluster
        clusters = {}
        for sentence, label in zip(sentences, cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(sentence)
        
        # Sort clusters by chronological order (first sentence timestamp)
        sorted_clusters = sorted(
            clusters.values(),
            key=lambda cluster: cluster[0]["time_start"]
        )
        
        return sorted_clusters
    
    def _determine_optimal_clusters(self, similarity_matrix: np.ndarray) -> int:
        """Determine optimal number of clusters based on similarity distribution"""
        # Calculate average similarity
        avg_similarity = np.mean(similarity_matrix[np.triu_indices_from(similarity_matrix, k=1)])
        
        # Estimate number of clusters based on similarity threshold
        if avg_similarity > 0.7:
            return max(1, len(similarity_matrix) // 10)
        elif avg_similarity > 0.5:
            return max(1, len(similarity_matrix) // 7)
        elif avg_similarity > 0.3:
            return max(1, len(similarity_matrix) // 5)
        else:
            return max(1, len(similarity_matrix) // 3)
    
    def _create_chunks_from_clusters(self, clusters: List[List[Dict[str, Any]]], video_id: str) -> List[Dict[str, Any]]:
        """Create chunk dictionaries from clusters"""
        chunks = []
        
        for i, cluster in enumerate(clusters):
            if not cluster:
                continue
                
            # Combine cluster sentences
            chunk_text = " ".join([s["text"] for s in cluster])
            
            # Get time range
            time_start = cluster[0]["time_start"]
            time_end = cluster[-1]["time_end"]
            
            # Create chunk
            chunk = {
                "chunk_id": f"{video_id}_chunk_{i:04d}",
                "chunk_index": i,
                "video_id": video_id,
                "text": chunk_text,
                "token_count": len(chunk_text.split()),
                "time_start": time_start,
                "time_end": time_end,
                "sentence_count": len(cluster),
                "segment_ids": list(set([s.get("segment_id") for s in cluster]))
            }
            
            chunks.append(chunk)
        
        return chunks
    
    def _apply_token_limits(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply token limits and merge small chunks"""
        if not chunks:
            return chunks
        
        processed_chunks = []
        current_chunk = None
        
        for chunk in chunks:
            token_count = chunk["token_count"]
            
            # If chunk is too small and we have a current chunk, merge it
            if (token_count < self.min_chunk_tokens and 
                current_chunk and 
                current_chunk["token_count"] + token_count <= self.max_chunk_tokens):
                
                # Merge with current chunk
                current_chunk["text"] += " " + chunk["text"]
                current_chunk["token_count"] += token_count
                current_chunk["time_end"] = chunk["time_end"]
                current_chunk["sentence_count"] += chunk["sentence_count"]
                current_chunk["segment_ids"].extend(chunk["segment_ids"])
                
            else:
                # Save current chunk if it exists
                if current_chunk:
                    processed_chunks.append(current_chunk)
                
                # Start new chunk (or split if too large)
                if token_count <= self.max_chunk_tokens:
                    current_chunk = chunk.copy()
                else:
                    # Split large chunk
                    split_chunks = self._split_large_chunk(chunk)
                    processed_chunks.extend(split_chunks)
                    current_chunk = None
        
        # Add the last chunk
        if current_chunk:
            processed_chunks.append(current_chunk)
        
        return processed_chunks
    
    def _split_large_chunk(self, chunk: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Split a chunk that exceeds token limits"""
        sentences = chunk["text"].split(". ")
        split_chunks = []
        
        current_text = ""
        current_tokens = 0
        chunk_index = chunk["chunk_index"]
        
        for i, sentence in enumerate(sentences):
            sentence_tokens = len(sentence.split())
            
            if current_tokens + sentence_tokens > self.max_chunk_tokens and current_text:
                # Create chunk from accumulated text
                split_chunk = {
                    "chunk_id": f"{chunk['video_id']}_chunk_{chunk_index:04d}_{len(split_chunks)}",
                    "chunk_index": chunk_index,
                    "video_id": chunk["video_id"],
                    "text": current_text.strip(),
                    "token_count": current_tokens,
                    "time_start": chunk["time_start"],
                    "time_end": chunk["time_start"] + (chunk["time_end"] - chunk["time_start"]) * (i / len(sentences)),
                    "sentence_count": current_text.count(". ") + 1,
                    "segment_ids": chunk["segment_ids"]
                }
                split_chunks.append(split_chunk)
                
                # Reset
                current_text = sentence
                current_tokens = sentence_tokens
            else:
                current_text += ". " + sentence if current_text else sentence
                current_tokens += sentence_tokens
        
        # Add remaining text
        if current_text:
            split_chunk = {
                "chunk_id": f"{chunk['video_id']}_chunk_{chunk_index:04d}_{len(split_chunks)}",
                "chunk_index": chunk_index,
                "video_id": chunk["video_id"],
                "text": current_text.strip(),
                "token_count": current_tokens,
                "time_start": chunk["time_start"],
                "time_end": chunk["time_end"],
                "sentence_count": current_text.count(". ") + 1,
                "segment_ids": chunk["segment_ids"]
            }
            split_chunks.append(split_chunk)
        
        return split_chunks
    
    def save_chunks(self, chunks: List[Dict[str, Any]], output_dir: str, video_id: str):
        """Save chunks to disk"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save without embeddings for readability
        chunks_path = os.path.join(output_dir, f"{video_id}_chunks.json")
        chunks_readable = [{k: v for k, v in chunk.items() if k != "embedding"} for chunk in chunks]
        
        with open(chunks_path, "w") as f:
            json.dump(chunks_readable, f, indent=2)
        
        logger.info(f"Saved {len(chunks)} chunks to {chunks_path}")
        
        return chunks_path
