"""Retrieval Engine with Fork-Join Parallel Search

Implements advanced retrieval with dual-channel search:
- Graph-based entity search using knowledge graph
- Vector-based semantic search using FAISS
- Query decomposition and entity extraction
- Result fusion and re-ranking
- Temporal context expansion
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import spacy
from concurrent.futures import ThreadPoolExecutor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import networkx as nx

from .knowledge_graph import KnowledgeGraph
from .vector_store import VectorStore

logger = logging.getLogger(__name__)


class RetrievalEngine:
    """Advanced retrieval engine with fork-join parallel search"""
    
    def __init__(self,
                 spacy_model: str = "en_core_web_sm",
                 fusion_weights: Optional[Dict[str, float]] = None,
                 max_workers: int = 4):
        """
        Initialize retrieval engine
        
        Args:
            spacy_model: Name of spaCy model for query processing
            fusion_weights: Weights for result fusion (vector, graph, text_overlap)
            max_workers: Maximum number of parallel workers
        """
        self.spacy_model = spacy_model
        self.nlp = None
        self.max_workers = max_workers
        
        # Fusion weights (default: vector search weighted more heavily)
        self.fusion_weights = fusion_weights or {
            "vector": 0.5,
            "graph": 0.3,
            "text_overlap": 0.2
        }
        
        # Components
        self.knowledge_graph = None
        self.vector_store = None
        self.semantic_chunks = []
        
        # Text processing
        self.tfidf_vectorizer = None
        
    def initialize(self, 
                   knowledge_graph: KnowledgeGraph,
                   vector_store: VectorStore,
                   semantic_chunks: List[Dict[str, Any]]):
        """
        Initialize retrieval engine with components
        
        Args:
            knowledge_graph: Knowledge graph instance
            vector_store: Vector store instance
            semantic_chunks: List of semantic chunks
        """
        try:
            # Load spaCy model
            self.nlp = spacy.load(self.spacy_model)
            logger.info(f"Loaded spaCy model: {self.spacy_model}")
            
            # Set components
            self.knowledge_graph = knowledge_graph
            self.vector_store = vector_store
            self.semantic_chunks = semantic_chunks
            
            # Initialize TF-IDF for text overlap scoring
            self._initialize_tfidf()
            
            logger.info("Retrieval engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize retrieval engine: {e}")
            raise
    
    def _initialize_tfidf(self):
        """Initialize TF-IDF vectorizer for text overlap scoring"""
        if not self.semantic_chunks:
            return
        
        # Extract chunk texts
        chunk_texts = [chunk["text"] for chunk in self.semantic_chunks]
        
        # Create and fit TF-IDF vectorizer with parameters suitable for small datasets
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=min(5000, len(chunk_texts) * 10),  # Adjust for small datasets
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1,  # Always include at least 1 document
            max_df=0.95 if len(chunk_texts) > 1 else 1.0  # Adjust for single document
        )
        self.tfidf_vectorizer.fit(chunk_texts)
        
        logger.info("TF-IDF vectorizer initialized")
    
    def decompose_query(self, query: str) -> Dict[str, Any]:
        """
        Decompose query into components for different search channels
        
        Args:
            query: User query string
            
        Returns:
            Dictionary with query components
        """
        if not self.nlp:
            raise RuntimeError("Retrieval engine not initialized")
        
        doc = self.nlp(query)
        
        # Extract entity terms (noun phrases, named entities, nouns)
        entity_terms = []
        
        # Noun phrases
        for chunk in doc.noun_chunks:
            if len(chunk.text.split()) <= 4:
                entity_terms.append(chunk.text.lower().strip())
        
        # Named entities
        for ent in doc.ents:
            entity_terms.append(ent.text.lower().strip())
        
        # Nouns
        for token in doc:
            if token.pos_ == "NOUN" and not token.is_stop:
                entity_terms.append(token.lemma_.lower().strip())
        
        # Extract keywords (important tokens)
        keywords = []
        for token in doc:
            if (token.pos_ in {"NOUN", "VERB", "ADJ"} and 
                not token.is_stop and 
                len(token.text) > 2):
                keywords.append(token.lemma_.lower().strip())
        
        # Extract visual terms (for potential future use)
        visual_terms = [term for term in entity_terms if any(
            visual_word in term for visual_word in 
            ["image", "video", "scene", "show", "display", "see", "look", "visual"]
        )]
        
        return {
            "raw": query,
            "entity_terms": list(set(entity_terms)),
            "keywords": list(set(keywords)),
            "visual_terms": list(set(visual_terms)),
            "named_entities": [ent.text.lower().strip() for ent in doc.ents],
            "query_type": self._classify_query_type(doc)
        }
    
    def _classify_query_type(self, doc) -> str:
        """Classify the type of query"""
        # Check for question words
        question_words = {"what", "who", "when", "where", "why", "how", "which"}
        if any(token.text.lower() in question_words for token in doc):
            return "question"
        
        # Check for search terms
        search_terms = {"find", "search", "look", "show", "get"}
        if any(token.lemma_.lower() in search_terms for token in doc):
            return "search"
        
        # Check for summary requests
        summary_terms = {"summarize", "summary", "recap", "overview"}
        if any(token.lemma_.lower() in summary_terms for token in doc):
            return "summary"
        
        return "general"
    
    async def retrieve(self, 
                      query: str, 
                      top_k_graph: int = 10,
                      top_k_vector: int = 10,
                      top_k_final: int = 5,
                      expand_temporal: bool = True) -> List[Dict[str, Any]]:
        """
        Perform retrieval with fork-join parallel search
        
        Args:
            query: User query
            top_k_graph: Number of results from graph search
            top_k_vector: Number of results from vector search
            top_k_final: Number of final results after fusion
            expand_temporal: Whether to expand temporal context
            
        Returns:
            List of retrieved chunks with scores
        """
        if not self.nlp or not self.knowledge_graph or not self.vector_store:
            raise RuntimeError("Retrieval engine not initialized")
        
        # Decompose query
        decomposed_query = self.decompose_query(query)
        logger.info(f"Query decomposed: {len(decomposed_query['entity_terms'])} entities, {len(decomposed_query['keywords'])} keywords")
        
        # Fork-join parallel search
        loop = asyncio.get_event_loop()
        
        # Create parallel tasks
        graph_task = loop.run_in_executor(
            None, self._graph_search, decomposed_query, top_k_graph
        )
        vector_task = loop.run_in_executor(
            None, self._vector_search, decomposed_query, top_k_vector, expand_temporal
        )
        
        # Wait for both searches to complete
        graph_results, vector_results = await asyncio.gather(graph_task, vector_task)
        
        logger.info(f"Graph search: {len(graph_results)} results, Vector search: {len(vector_results)} results")
        
        # Fuse and re-rank results
        fused_results = self._fuse_and_rerank(
            graph_results, vector_results, decomposed_query, top_k_final
        )
        
        logger.info(f"Final retrieval: {len(fused_results)} results")
        return fused_results
    
    def _graph_search(self, decomposed_query: Dict[str, Any], k: int) -> List[Dict[str, Any]]:
        """Perform graph-based search using knowledge graph"""
        entity_terms = decomposed_query["entity_terms"]
        
        if not entity_terms or not self.knowledge_graph.graph:
            return []
        
        chunk_scores = {}
        
        # Search for entities in the knowledge graph
        for term in entity_terms:
            # Find matching entities
            matching_entities = self.knowledge_graph.search_entities(term, top_k=20)
            
            for entity_info in matching_entities:
                entity = entity_info["entity"]
                match_score = entity_info["match_score"]
                
                # Get related chunks
                chunk_ids = entity_info["chunk_ids"]
                for chunk_id in chunk_ids:
                    # Score based on entity importance and match
                    entity_score = match_score * entity_info["confidence"]
                    
                    # Boost score based on graph centrality
                    centrality_boost = entity_info.get("degree_centrality", 0.0) * 0.1
                    
                    total_score = entity_score + centrality_boost
                    chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0.0) + total_score
        
        # Convert scores to chunk objects
        chunk_lookup = {chunk["chunk_id"]: chunk for chunk in self.semantic_chunks}
        results = []
        
        for chunk_id, score in sorted(chunk_scores.items(), key=lambda x: x[1], reverse=True)[:k]:
            if chunk_id in chunk_lookup:
                chunk = chunk_lookup[chunk_id].copy()
                chunk["graph_score"] = float(score)
                results.append(chunk)
        
        return results
    
    def _vector_search(self, 
                      decomposed_query: Dict[str, Any], 
                      k: int,
                      expand_temporal: bool = True) -> List[Dict[str, Any]]:
        """Perform vector-based semantic search"""
        query = decomposed_query["raw"]
        
        if not self.vector_store:
            return []
        
        # Use vector store search
        results = self.vector_store.search(
            query=query,
            k=k,
            expand_temporal=expand_temporal
        )
        
        return results
    
    def _fuse_and_rerank(self, 
                        graph_results: List[Dict[str, Any]],
                        vector_results: List[Dict[str, Any]],
                        decomposed_query: Dict[str, Any],
                        k: int) -> List[Dict[str, Any]]:
        """
        Fuse results from both channels and re-rank
        
        Args:
            graph_results: Results from graph search
            vector_results: Results from vector search
            decomposed_query: Decomposed query information
            k: Number of final results
            
        Returns:
            Re-ranked fused results
        """
        # Deduplicate by chunk_id
        seen_chunks = set()
        merged_results = []
        
        for result in graph_results + vector_results:
            chunk_id = result.get("chunk_id", "")
            if chunk_id and chunk_id not in seen_chunks:
                seen_chunks.add(chunk_id)
                merged_results.append(result)
        
        # Compute text overlap scores
        text_overlap_scores = self._compute_text_overlap_scores(merged_results, decomposed_query)
        
        # Compute final scores
        for result in merged_results:
            vector_score = result.get("vector_score", 0.0)
            graph_score = result.get("graph_score", 0.0)
            text_overlap = text_overlap_scores.get(result["chunk_id"], 0.0)
            
            # Normalize scores
            vector_score = min(vector_score, 1.0)
            graph_score = min(graph_score / 10.0, 1.0)  # Graph scores can be higher
            text_overlap = min(text_overlap, 1.0)
            
            # Weighted fusion
            final_score = (
                self.fusion_weights["vector"] * vector_score +
                self.fusion_weights["graph"] * graph_score +
                self.fusion_weights["text_overlap"] * text_overlap
            )
            
            result["final_score"] = round(final_score, 4)
            result["text_overlap_score"] = round(text_overlap, 4)
            
            # Add ranking information
            result["vector_rank"] = 1.0 if vector_score > 0 else 0.0
            result["graph_rank"] = 1.0 if graph_score > 0 else 0.0
        
        # Sort by final score
        merged_results.sort(key=lambda x: x["final_score"], reverse=True)
        
        return merged_results[:k]
    
    def _compute_text_overlap_scores(self, 
                                   results: List[Dict[str, Any]], 
                                   decomposed_query: Dict[str, Any]) -> Dict[str, float]:
        """Compute text overlap scores using TF-IDF"""
        if not self.tfidf_vectorizer or not results:
            return {}
        
        # Get query terms
        query_terms = decomposed_query["keywords"] + decomposed_query["entity_terms"]
        query_text = " ".join(query_terms)
        
        if not query_text.strip():
            return {}
        
        # Vectorize query
        try:
            query_vector = self.tfidf_vectorizer.transform([query_text])
        except:
            # Fallback to simple word overlap
            return self._compute_simple_word_overlap(results, query_terms)
        
        scores = {}
        
        for result in results:
            chunk_text = result.get("text", "")
            
            try:
                # Vectorize chunk
                chunk_vector = self.tfidf_vectorizer.transform([chunk_text])
                
                # Compute cosine similarity
                similarity = cosine_similarity(query_vector, chunk_vector)[0][0]
                scores[result["chunk_id"]] = float(similarity)
                
            except:
                # Fallback to simple overlap
                scores[result["chunk_id"]] = self._simple_overlap_score(chunk_text, query_terms)
        
        return scores
    
    def _compute_simple_word_overlap(self, results: List[Dict[str, Any]], query_terms: List[str]) -> Dict[str, float]:
        """Simple word overlap scoring as fallback"""
        query_words = set(query_terms)
        scores = {}
        
        for result in results:
            chunk_words = set(result.get("text", "").lower().split())
            overlap = len(query_words & chunk_words)
            scores[result["chunk_id"]] = overlap / (len(query_words) + 1e-9)
        
        return scores
    
    def _simple_overlap_score(self, text: str, query_terms: List[str]) -> float:
        """Simple overlap score for a single text"""
        query_words = set(query_terms)
        text_words = set(text.lower().split())
        overlap = len(query_words & text_words)
        return overlap / (len(query_words) + 1e-9)
    
    def get_explanation(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Get explanation for why a result was retrieved"""
        explanation = {
            "chunk_id": result["chunk_id"],
            "final_score": result.get("final_score", 0.0),
            "score_breakdown": {
                "vector_search": {
                    "score": result.get("vector_score", 0.0),
                    "weight": self.fusion_weights["vector"],
                    "contribution": result.get("vector_score", 0.0) * self.fusion_weights["vector"]
                },
                "graph_search": {
                    "score": result.get("graph_score", 0.0),
                    "weight": self.fusion_weights["graph"],
                    "contribution": result.get("graph_score", 0.0) * self.fusion_weights["graph"]
                },
                "text_overlap": {
                    "score": result.get("text_overlap_score", 0.0),
                    "weight": self.fusion_weights["text_overlap"],
                    "contribution": result.get("text_overlap_score", 0.0) * self.fusion_weights["text_overlap"]
                }
            },
            "chunk_info": {
                "time_start": result.get("time_start", 0.0),
                "time_end": result.get("time_end", 0.0),
                "token_count": result.get("token_count", 0),
                "video_id": result.get("video_id", "")
            }
        }
        
        # Add context type if available
        if "context_type" in result:
            explanation["context_type"] = result["context_type"]
        
        return explanation
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get retrieval engine statistics"""
        stats = {
            "fusion_weights": self.fusion_weights,
            "max_workers": self.max_workers,
            "components": {
                "knowledge_graph": {
                    "nodes": self.knowledge_graph.graph.number_of_nodes() if self.knowledge_graph.graph else 0,
                    "edges": self.knowledge_graph.graph.number_of_edges() if self.knowledge_graph.graph else 0
                },
                "vector_store": {
                    "num_chunks": len(self.vector_store.metadata) if self.vector_store.metadata else 0,
                    "index_type": self.vector_store.index_type if self.vector_store else None
                },
                "semantic_chunks": len(self.semantic_chunks)
            }
        }
        
        return stats
