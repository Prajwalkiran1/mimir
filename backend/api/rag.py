"""RAG (Retrieval-Augmented Generation) API endpoints"""

import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pipeline.knowledge_graph import KnowledgeGraph
from pipeline.vector_store import VectorStore
from pipeline.retrieval_engine import RetrievalEngine
from app_state import task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rag", tags=["rag"])

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    video_id: Optional[str] = None
    top_k: int = 5
    expand_temporal: bool = True
    include_explanations: bool = False

class SearchRequest(BaseModel):
    query: str
    video_ids: Optional[List[str]] = None
    top_k: int = 10
    search_type: str = "hybrid"  # "vector", "graph", "hybrid"

class EntityRequest(BaseModel):
    entity: str
    video_id: Optional[str] = None
    top_k: int = 10
    relation_type: Optional[str] = None

class VideoIndexRequest(BaseModel):
    video_id: str
    index_path: str

@router.post("/query")
async def query_video(request: QueryRequest):
    """
    Query a video's content using natural language
    
    Args:
        request: Query request with question and parameters
        
    Returns:
        Retrieved chunks with relevance scores
    """
    try:
        # Validate video_id
        if not request.video_id:
            raise HTTPException(status_code=400, detail="video_id is required")
        
        # Check if video exists and has RAG processing
        task = task_manager.get_task(request.video_id)
        if not task:
            raise HTTPException(status_code=404, detail="Video not found")
        
        if not task.results or not task.results.get('rag'):
            raise HTTPException(status_code=400, detail="RAG processing not completed for this video")
        
        rag_result = task.results['rag']
        index_dir = rag_result['index_dir']
        
        # Load RAG components
        if not os.path.exists(index_dir):
            raise HTTPException(status_code=404, detail="RAG index not found")
        
        # Load knowledge graph
        kg_path = os.path.join(index_dir, f"{request.video_id}_knowledge_graph.pkl")
        if not os.path.exists(kg_path):
            raise HTTPException(status_code=404, detail="Knowledge graph not found")
        
        knowledge_graph = KnowledgeGraph()
        knowledge_graph.graph = KnowledgeGraph.load_graph(kg_path)
        
        # Load vector store
        vector_store = VectorStore.load(index_dir, request.video_id)
        
        # Load semantic chunks
        chunks_path = os.path.join(rag_result['chunks_dir'], f"{request.video_id}_chunks.json")
        if not os.path.exists(chunks_path):
            raise HTTPException(status_code=404, detail="Chunks not found")
        
        import json
        with open(chunks_path, 'r') as f:
            semantic_chunks = json.load(f)
        
        # Initialize retrieval engine
        retrieval_engine = RetrievalEngine()
        retrieval_engine.initialize(knowledge_graph, vector_store, semantic_chunks)
        
        # Perform retrieval
        results = await retrieval_engine.retrieve(
            query=request.query,
            top_k_final=request.top_k,
            expand_temporal=request.expand_temporal
        )
        
        # Format response
        response = {
            "query": request.query,
            "video_id": request.video_id,
            "num_results": len(results),
            "results": []
        }
        
        for result in results:
            result_data = {
                "chunk_id": result["chunk_id"],
                "text": result["text"],
                "time_start": result["time_start"],
                "time_end": result["time_end"],
                "relevance_score": result["final_score"],
                "score_breakdown": {
                    "vector_score": result.get("vector_score", 0.0),
                    "graph_score": result.get("graph_score", 0.0),
                    "text_overlap": result.get("text_overlap_score", 0.0)
                }
            }
            
            # Add explanations if requested
            if request.include_explanations:
                result_data["explanation"] = retrieval_engine.get_explanation(result)
            
            # Add context type if available
            if "context_type" in result:
                result_data["context_type"] = result["context_type"]
            
            response["results"].append(result_data)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@router.post("/search")
async def search_videos(request: SearchRequest):
    """
    Search across multiple videos
    
    Args:
        request: Search request with query and parameters
        
    Returns:
        Search results from multiple videos
    """
    try:
        # Get all tasks
        all_tasks = task_manager.get_all_tasks()
        
        # Filter videos with RAG processing
        rag_videos = []
        for task in all_tasks:
            if task.results and task.results.get('rag'):
                if not request.video_ids or task.task_id in request.video_ids:
                    rag_videos.append(task)
        
        if not rag_videos:
            raise HTTPException(status_code=404, detail="No videos with RAG processing found")
        
        all_results = []
        
        # Search each video
        for video_task in rag_videos:
            video_id = video_task.task_id
            rag_result = video_task.results['rag']
            index_dir = rag_result['index_dir']
            
            try:
                # Load RAG components for this video
                kg_path = os.path.join(index_dir, f"{video_id}_knowledge_graph.pkl")
                knowledge_graph = KnowledgeGraph()
                knowledge_graph.graph = KnowledgeGraph.load_graph(kg_path)
                
                vector_store = VectorStore.load(index_dir, video_id)
                
                chunks_path = os.path.join(rag_result['chunks_dir'], f"{video_id}_chunks.json")
                with open(chunks_path, 'r') as f:
                    semantic_chunks = json.load(f)
                
                retrieval_engine = RetrievalEngine()
                retrieval_engine.initialize(knowledge_graph, vector_store, semantic_chunks)
                
                # Perform search
                if request.search_type == "vector":
                    results = vector_store.search(request.query, k=request.top_k)
                elif request.search_type == "graph":
                    decomposed = retrieval_engine.decompose_query(request.query)
                    results = retrieval_engine._graph_search(decomposed, request.top_k)
                else:  # hybrid
                    results = await retrieval_engine.retrieve(
                        query=request.query,
                        top_k_final=request.top_k,
                        expand_temporal=False
                    )
                
                # Add video_id to results
                for result in results:
                    result["video_id"] = video_id
                
                all_results.extend(results)
                
            except Exception as e:
                logger.warning(f"Failed to search video {video_id}: {str(e)}")
                continue
        
        # Sort all results by relevance score
        all_results.sort(key=lambda x: x.get("final_score", x.get("vector_score", 0.0)), reverse=True)
        
        # Limit results
        final_results = all_results[:request.top_k]
        
        # Format response
        response = {
            "query": request.query,
            "num_videos_searched": len(rag_videos),
            "num_results": len(final_results),
            "results": []
        }
        
        for result in final_results:
            result_data = {
                "video_id": result["video_id"],
                "chunk_id": result["chunk_id"],
                "text": result["text"],
                "time_start": result["time_start"],
                "time_end": result["time_end"],
                "relevance_score": result.get("final_score", result.get("vector_score", 0.0))
            }
            response["results"].append(result_data)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/entities")
async def search_entities(request: EntityRequest):
    """
    Search for entities in the knowledge graph
    
    Args:
        request: Entity search request
        
    Returns:
        Entity information and related entities
    """
    try:
        # Validate video_id
        if not request.video_id:
            raise HTTPException(status_code=400, detail="video_id is required")
        
        # Check if video exists and has RAG processing
        task = task_manager.get_task(request.video_id)
        if not task or not task.results or not task.results.get('rag'):
            raise HTTPException(status_code=404, detail="Video not found or RAG processing not completed")
        
        rag_result = task.results['rag']
        index_dir = rag_result['index_dir']
        
        # Load knowledge graph
        kg_path = os.path.join(index_dir, f"{request.video_id}_knowledge_graph.pkl")
        knowledge_graph = KnowledgeGraph()
        knowledge_graph.graph = KnowledgeGraph.load_graph(kg_path)
        
        # Search for entities
        matching_entities = knowledge_graph.search_entities(request.entity, top_k=request.top_k)
        
        # Get related entities for each match
        results = []
        for entity_info in matching_entities:
            entity = entity_info["entity"]
            
            # Get related entities
            related_entities = knowledge_graph.get_related_entities(
                entity, 
                relation_type=request.relation_type, 
                top_k=5
            )
            
            result_data = {
                "entity": entity,
                "entity_type": entity_info["entity_type"],
                "confidence": entity_info["confidence"],
                "mentions": entity_info["mentions"],
                "degree_centrality": entity_info["degree_centrality"],
                "chunk_ids": entity_info["chunk_ids"],
                "related_entities": related_entities
            }
            
            results.append(result_data)
        
        return {
            "query": request.entity,
            "video_id": request.video_id,
            "num_results": len(results),
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Entity search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Entity search failed: {str(e)}")

@router.get("/video/{video_id}/status")
async def get_rag_status(video_id: str):
    """
    Get RAG processing status for a video
    
    Args:
        video_id: Video identifier
        
    Returns:
        RAG processing status and statistics
    """
    try:
        # Check if video exists
        task = task_manager.get_task(video_id)
        if not task:
            raise HTTPException(status_code=404, detail="Video not found")
        
        if not task.results or not task.results.get('rag'):
            return {
                "video_id": video_id,
                "rag_processed": False,
                "message": "RAG processing not completed"
            }
        
        rag_result = task.results['rag']
        index_dir = rag_result['index_dir']
        
        # Load components and get statistics
        try:
            # Load knowledge graph
            kg_path = os.path.join(index_dir, f"{video_id}_knowledge_graph.pkl")
            knowledge_graph = KnowledgeGraph()
            knowledge_graph.graph = KnowledgeGraph.load_graph(kg_path)
            kg_summary = knowledge_graph.get_graph_summary()
            
            # Load vector store
            vector_store = VectorStore.load(index_dir, video_id)
            vs_stats = vector_store.get_statistics()
            
            # Load chunks
            chunks_path = os.path.join(rag_result['chunks_dir'], f"{video_id}_chunks.json")
            with open(chunks_path, 'r') as f:
                semantic_chunks = json.load(f)
            
            return {
                "video_id": video_id,
                "rag_processed": True,
                "processing_date": task.updated_at,
                "statistics": {
                    "chunks": {
                        "total": len(semantic_chunks),
                        "avg_tokens": vs_stats.get("avg_tokens_per_chunk", 0),
                        "total_tokens": vs_stats.get("total_tokens", 0)
                    },
                    "knowledge_graph": {
                        "nodes": kg_summary["num_nodes"],
                        "edges": kg_summary["num_edges"],
                        "density": kg_summary["density"],
                        "entity_types": kg_summary["entity_types"]
                    },
                    "vector_store": {
                        "index_type": vs_stats.get("index_type"),
                        "embedding_dim": vs_stats.get("embedding_dim"),
                        "index_size": vs_stats.get("index_size")
                    }
                }
            }
            
        except Exception as e:
            logger.warning(f"Failed to load RAG components for status: {str(e)}")
            return {
                "video_id": video_id,
                "rag_processed": True,
                "message": "RAG processed but components unavailable",
                "basic_stats": rag_result
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/videos")
async def list_rag_videos():
    """
    List all videos with RAG processing
    
    Returns:
        List of videos with RAG capabilities
    """
    try:
        all_tasks = task_manager.get_all_tasks()
        
        rag_videos = []
        for task in all_tasks:
            if task.results and task.results.get('rag'):
                rag_result = task.results['rag']
                
                video_info = {
                    "video_id": task.task_id,
                    "filename": task.video_path.split('/')[-1] if task.video_path else "unknown",
                    "processed_date": task.updated_at,
                    "rag_stats": {
                        "num_chunks": rag_result.get("num_chunks", 0),
                        "kg_nodes": rag_result.get("kg_nodes", 0),
                        "kg_edges": rag_result.get("kg_edges", 0),
                        "vector_index_size": rag_result.get("vector_index_size", 0)
                    }
                }
                
                rag_videos.append(video_info)
        
        return {
            "total_videos": len(rag_videos),
            "videos": rag_videos
        }
        
    except Exception as e:
        logger.error(f"Failed to list RAG videos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list videos: {str(e)}")

@router.delete("/video/{video_id}/index")
async def delete_rag_index(video_id: str):
    """
    Delete RAG index for a video
    
    Args:
        video_id: Video identifier
        
    Returns:
        Deletion status
    """
    try:
        # Check if video exists
        task = task_manager.get_task(video_id)
        if not task:
            raise HTTPException(status_code=404, detail="Video not found")
        
        if not task.results or not task.results.get('rag'):
            return {"message": "No RAG index to delete"}
        
        rag_result = task.results['rag']
        index_dir = rag_result['index_dir']
        chunks_dir = rag_result['chunks_dir']
        
        # Delete index directories
        import shutil
        if os.path.exists(index_dir):
            shutil.rmtree(index_dir)
        
        if os.path.exists(chunks_dir):
            shutil.rmtree(chunks_dir)
        
        # Remove RAG results from task
        if 'rag' in task.results:
            del task.results['rag']
        
        return {
            "video_id": video_id,
            "message": "RAG index deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete RAG index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete index: {str(e)}")
