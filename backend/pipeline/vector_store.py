"""Vector Store for Semantic Search using FAISS

Provides efficient similarity search for transcript chunks:
- FAISS indexing for fast approximate nearest neighbor search
- Cosine similarity on normalized embeddings
- Metadata storage for chunk information
- Temporal context expansion (prev/next chunk pointers)
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
    """FAISS-based vector store for semantic chunk retrieval"""
    
    def __init__(self, 
                 embedding_dim: int = 384,
                 model_name: str = "all-MiniLM-L6-v2",
                 index_type: str = "flat"):
        """
        Initialize vector store
        
        Args:
            embedding_dim: Dimension of embeddings
            model_name: Sentence transformer model name
            index_type: Type of FAISS index ("flat", "ivf", "hnsw")
        """
        self.embedding_dim = embedding_dim
        self.model_name = model_name
        self.index_type = index_type
        self.model = None
        self.index = None
        self.metadata = []  # Parallel list of chunk metadata
        self.is_normalized = False
        
    def initialize(self):
        """Initialize the sentence transformer model and FAISS index"""
        try:
            # Load sentence transformer model
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded sentence transformer: {self.model_name}")
            
            # Create FAISS index based on type
            if self.index_type == "flat":
                # Inner product index (equivalent to cosine on normalized vectors)
                self.index = faiss.IndexFlatIP(self.embedding_dim)
            elif self.index_type == "ivf":
                # Inverted file index for faster search
                nlist = min(100, max(4, 1000))  # Number of clusters
                quantizer = faiss.IndexFlatIP(self.embedding_dim)
                self.index = faiss.IndexIVFFlat(quantizer, self.embedding_dim, nlist)
            elif self.index_type == "hnsw":
                # Hierarchical navigable small world graph
                self.index = faiss.IndexHNSWFlat(self.embedding_dim, 32)
                self.index.hnsw.efConstruction = 200
                self.index.hnsw.efSearch = 50
            else:
                raise ValueError(f"Unsupported index type: {self.index_type}")
                
            logger.info(f"Created FAISS index: {self.index_type}")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            raise
    
    def add_chunks(self, chunks: List[Dict[str, Any]], compute_embeddings: bool = True):
        """
        Add chunks to the vector store
        
        Args:
            chunks: List of chunk dictionaries with text and metadata
            compute_embeddings: Whether to compute embeddings or use existing ones
        """
        if not self.model:
            self.initialize()
        
        # Extract or compute embeddings
        if compute_embeddings:
            texts = [chunk["text"] for chunk in chunks]
            embeddings = self.model.encode(
                texts, 
                convert_to_numpy=True,
                batch_size=32,
                show_progress_bar=True
            )
        else:
            # Use existing embeddings
            embeddings = np.array([chunk["embedding"] for chunk in chunks], dtype=np.float32)
        
        # Normalize embeddings for cosine similarity
        if not self.is_normalized:
            norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            embeddings /= norms
            self.is_normalized = True
        
        # Add to FAISS index
        if self.index_type == "ivf" and not self.index.is_trained:
            # Train IVF index
            self.index.train(embeddings)
            logger.info("Trained IVF index")
        
        self.index.add(embeddings)
        
        # Store metadata
        for i, chunk in enumerate(chunks):
            metadata = {
                "faiss_id": i,
                "chunk_id": chunk["chunk_id"],
                "chunk_index": chunk["chunk_index"],
                "video_id": chunk["video_id"],
                "text": chunk["text"],
                "time_start": chunk["time_start"],
                "time_end": chunk["time_end"],
                "token_count": chunk.get("token_count", 0),
                "sentence_count": chunk.get("sentence_count", 0)
            }
            
            # Add temporal context pointers
            if i > 0:
                metadata["prev_chunk"] = chunks[i-1]["chunk_id"]
            else:
                metadata["prev_chunk"] = None
                
            if i < len(chunks) - 1:
                metadata["next_chunk"] = chunks[i+1]["chunk_id"]
            else:
                metadata["next_chunk"] = None
            
            # Store embedding if provided
            if "embedding" in chunk:
                metadata["embedding"] = chunk["embedding"]
            
            self.metadata.append(metadata)
        
        logger.info(f"Added {len(chunks)} chunks to vector store")
    
    def search(self, 
               query: str, 
               k: int = 10,
               expand_temporal: bool = True,
               temporal_window: int = 2) -> List[Dict[str, Any]]:
        """
        Search for similar chunks
        
        Args:
            query: Query string
            k: Number of results to return
            expand_temporal: Whether to include temporal context
            temporal_window: Number of adjacent chunks to include
            
        Returns:
            List of search results with scores
        """
        if not self.model or not self.index:
            raise RuntimeError("Vector store not initialized")
        
        # Encode query
        query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
        query_embedding = query_embedding.astype(np.float32).reshape(1, -1)
        
        # Normalize query embedding
        query_embedding /= (np.linalg.norm(query_embedding) + 1e-9)
        
        # Search
        scores, indices = self.index.search(query_embedding, k)
        
        results = []
        chunk_ids_seen = set()
        
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.metadata):
                result = self.metadata[idx].copy()
                result["vector_score"] = float(score)
                results.append(result)
                chunk_ids_seen.add(result["chunk_id"])
        
        # Expand temporal context if requested
        if expand_temporal:
            temporal_results = self._expand_temporal_context(results, temporal_window, chunk_ids_seen)
            results.extend(temporal_results)
        
        # Sort by score
        results.sort(key=lambda x: x["vector_score"], reverse=True)
        
        return results[:k]
    
    def _expand_temporal_context(self, 
                                initial_results: List[Dict[str, Any]], 
                                window: int,
                                seen_chunk_ids: set) -> List[Dict[str, Any]]:
        """Expand results with temporal context chunks"""
        temporal_results = []
        
        for result in initial_results:
            chunk_id = result["chunk_id"]
            
            # Find previous chunks
            prev_chunk_id = result.get("prev_chunk")
            for i in range(window):
                if prev_chunk_id and prev_chunk_id not in seen_chunk_ids:
                    prev_chunk = self._find_chunk_by_id(prev_chunk_id)
                    if prev_chunk:
                        temp_result = prev_chunk.copy()
                        temp_result["vector_score"] = result["vector_score"] * (0.8 ** (i + 1))  # Decay score
                        temp_result["context_type"] = "previous"
                        temporal_results.append(temp_result)
                        seen_chunk_ids.add(prev_chunk_id)
                    
                    # Get next previous chunk
                    prev_chunk_id = prev_chunk.get("prev_chunk") if prev_chunk else None
                else:
                    break
            
            # Find next chunks
            next_chunk_id = result.get("next_chunk")
            for i in range(window):
                if next_chunk_id and next_chunk_id not in seen_chunk_ids:
                    next_chunk = self._find_chunk_by_id(next_chunk_id)
                    if next_chunk:
                        temp_result = next_chunk.copy()
                        temp_result["vector_score"] = result["vector_score"] * (0.8 ** (i + 1))  # Decay score
                        temp_result["context_type"] = "next"
                        temporal_results.append(temp_result)
                        seen_chunk_ids.add(next_chunk_id)
                    
                    # Get next next chunk
                    next_chunk_id = next_chunk.get("next_chunk") if next_chunk else None
                else:
                    break
        
        return temporal_results
    
    def _find_chunk_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Find chunk metadata by chunk_id"""
        for metadata in self.metadata:
            if metadata["chunk_id"] == chunk_id:
                return metadata
        return None
    
    def get_similar_chunks(self, chunk_id: str, k: int = 5) -> List[Dict[str, Any]]:
        """Find chunks similar to a given chunk"""
        target_chunk = self._find_chunk_by_id(chunk_id)
        if not target_chunk:
            return []
        
        return self.search(target_chunk["text"], k, expand_temporal=False)
    
    def get_video_chunks(self, video_id: str) -> List[Dict[str, Any]]:
        """Get all chunks from a specific video"""
        return [meta for meta in self.metadata if meta["video_id"] == video_id]
    
    def get_time_range_chunks(self, 
                             video_id: str, 
                             start_time: float, 
                             end_time: float) -> List[Dict[str, Any]]:
        """Get chunks within a time range"""
        video_chunks = self.get_video_chunks(video_id)
        
        return [
            chunk for chunk in video_chunks
            if (chunk["time_start"] >= start_time and chunk["time_start"] < end_time) or
               (chunk["time_end"] > start_time and chunk["time_end"] <= end_time) or
               (chunk["time_start"] <= start_time and chunk["time_end"] >= end_time)
        ]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        if not self.metadata:
            return {}
        
        # Basic stats
        num_chunks = len(self.metadata)
        num_videos = len(set(meta["video_id"] for meta in self.metadata))
        
        # Token and time statistics
        token_counts = [meta["token_count"] for meta in self.metadata]
        sentence_counts = [meta["sentence_count"] for meta in self.metadata]
        
        # Video-specific stats
        video_stats = {}
        for video_id in set(meta["video_id"] for meta in self.metadata):
            video_chunks = self.get_video_chunks(video_id)
            video_stats[video_id] = {
                "num_chunks": len(video_chunks),
                "total_tokens": sum(c["token_count"] for c in video_chunks),
                "avg_tokens_per_chunk": np.mean([c["token_count"] for c in video_chunks]),
                "duration": max(c["time_end"] for c in video_chunks) - min(c["time_start"] for c in video_chunks)
            }
        
        return {
            "num_chunks": num_chunks,
            "num_videos": num_videos,
            "embedding_dim": self.embedding_dim,
            "index_type": self.index_type,
            "index_size": self.index.ntotal if self.index else 0,
            "total_tokens": sum(token_counts),
            "avg_tokens_per_chunk": np.mean(token_counts) if token_counts else 0,
            "max_tokens_per_chunk": max(token_counts) if token_counts else 0,
            "min_tokens_per_chunk": min(token_counts) if token_counts else 0,
            "total_sentences": sum(sentence_counts),
            "avg_sentences_per_chunk": np.mean(sentence_counts) if sentence_counts else 0,
            "video_stats": video_stats
        }
    
    def save(self, output_dir: str, video_id: str):
        """Save vector store to disk"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save FAISS index
        index_path = os.path.join(output_dir, f"{video_id}_vector_store.faiss")
        faiss.write_index(self.index, index_path)
        
        # Save metadata
        metadata_path = os.path.join(output_dir, f"{video_id}_vector_store_meta.json")
        with open(metadata_path, "w") as f:
            json.dump(self.metadata, f, indent=2)
        
        # Save configuration and statistics
        config_path = os.path.join(output_dir, f"{video_id}_vector_store_config.json")
        config_data = {
            "embedding_dim": self.embedding_dim,
            "model_name": self.model_name,
            "index_type": self.index_type,
            "is_normalized": self.is_normalized,
            "statistics": self.get_statistics()
        }
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"Saved vector store to {index_path} and {metadata_path}")
        return index_path, metadata_path
    
    @classmethod
    def load(cls, output_dir: str, video_id: str):
        """Load vector store from disk"""
        # Load configuration
        config_path = os.path.join(output_dir, f"{video_id}_vector_store_config.json")
        with open(config_path, "r") as f:
            config_data = json.load(f)
        
        # Create instance
        vector_store = cls(
            embedding_dim=config_data["embedding_dim"],
            model_name=config_data["model_name"],
            index_type=config_data["index_type"]
        )
        
        # Initialize model
        vector_store.initialize()
        vector_store.is_normalized = config_data["is_normalized"]
        
        # Load FAISS index
        index_path = os.path.join(output_dir, f"{video_id}_vector_store.faiss")
        vector_store.index = faiss.read_index(index_path)
        
        # Load metadata
        metadata_path = os.path.join(output_dir, f"{video_id}_vector_store_meta.json")
        with open(metadata_path, "r") as f:
            vector_store.metadata = json.load(f)
        
        logger.info(f"Loaded vector store from {index_path}")
        return vector_store
    
    def merge(self, other_vector_store: 'VectorStore'):
        """Merge another vector store into this one"""
        if self.embedding_dim != other_vector_store.embedding_dim:
            raise ValueError("Cannot merge vector stores with different embedding dimensions")
        
        # Merge indexes
        if self.index_type == "flat" and other_vector_store.index_type == "flat":
            # For flat indexes, we can merge the embeddings directly
            all_embeddings = []
            
            # Get embeddings from this store
            if self.index.ntotal > 0:
                # Reconstruct embeddings from this index
                embeddings = np.zeros((self.index.ntotal, self.embedding_dim), dtype=np.float32)
                self.index.reconstruct_n(0, self.index.ntotal, embeddings)
                all_embeddings.append(embeddings)
            
            # Get embeddings from other store
            if other_vector_store.index.ntotal > 0:
                embeddings = np.zeros((other_vector_store.index.ntotal, self.embedding_dim), dtype=np.float32)
                other_vector_store.index.reconstruct_n(0, other_vector_store.index.ntotal, embeddings)
                all_embeddings.append(embeddings)
            
            # Create new index with merged embeddings
            if all_embeddings:
                merged_embeddings = np.vstack(all_embeddings)
                self.index.reset()
                self.index.add(merged_embeddings)
            
            # Merge metadata
            offset = len(self.metadata)
            for i, meta in enumerate(other_vector_store.metadata):
                meta_copy = meta.copy()
                meta_copy["faiss_id"] = offset + i
                self.metadata.append(meta_copy)
            
            logger.info(f"Merged vector stores: {len(self.metadata)} total chunks")
        else:
            raise NotImplementedError("Merging not implemented for this index type")
