"""Video processing API routes"""

import os
import uuid
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pipeline.orchestrator import PipelineError
from pipeline.config import config
from app_state import orchestrator as pipeline_orchestrator, task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["video"])

# Pydantic models
class ProcessingOptions(BaseModel):
    transcript: bool = True
    summary: bool = True
    subtitles: bool = True
    keyframes: bool = False
    rag: bool = False
    topic_based: bool = False
    topic: Optional[str] = None
    download_format: str = "srt"
    use_gpu: bool = True
    video_id: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow extra fields
        
    def model_dump(self, **kwargs):
        """Override model_dump method to handle None values properly"""
        data = super().model_dump(**kwargs)
        # Ensure topic is included even if None
        if 'topic' not in data:
            data['topic'] = None
        return data

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    options: str = Form(None)
):
    """Upload video and start processing"""
    
    # Validate file
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Check file size
    file_size = 0
    content = await file.read()
    file_size = len(content)
    await file.seek(0)  # Reset file pointer
    
    max_size_mb = config.max_file_size_mb
    if file_size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail=f"File size exceeds {max_size_mb}MB limit"
        )
    
    # Parse options
    try:
        if options:
            import json
            options_dict = json.loads(options)
            processing_options = ProcessingOptions(**options_dict)
        else:
            processing_options = ProcessingOptions()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid options: {str(e)}")
    
    # Generate task ID
    task_id = str(uuid.uuid4())
    
    # Create upload directory
    upload_dir = os.path.join(config.upload_dir, task_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save video file
    video_path = os.path.join(upload_dir, file.filename)
    with open(video_path, "wb") as buffer:
        buffer.write(content)
    
    # Initialize task
    task_manager.create_task(task_id, video_path, processing_options.model_dump())
    
    # Start background processing
    try:
        background_tasks.add_task(
            process_video_task, 
            task_id, 
            video_path, 
            processing_options
        )
        logger.info(f"Background task started for task {task_id}")
    except Exception as e:
        logger.error(f"Failed to start background task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")
    
    return {
        "task_id": task_id,
        "message": "Video uploaded successfully",
        "filename": file.filename,
        "file_size": file_size
    }

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """Get processing status"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task.to_dict()

@router.get("/results/{task_id}")
async def get_results(task_id: str):
    """Get processing results"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="Processing not completed")
    
    return task.results

@router.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """Delete task and cleanup files"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Cleanup files
    task_manager.cleanup_task(task_id)
    
    return {"message": "Task deleted successfully"}

@router.get("/tasks")
async def list_tasks():
    """List all tasks"""
    tasks = task_manager.get_all_tasks()
    return {"tasks": [task.to_dict() for task in tasks]}

async def process_video_task(task_id: str, video_path: str, options: ProcessingOptions):
    """Background task for video processing"""
    try:
        # Update task status
        task_manager.update_status(task_id, "processing", "Initializing pipeline...", 5)
        
        # Process video
        results = await pipeline_orchestrator.process_video(
            video_path=video_path,
            options=options.model_dump(),
            progress_callback=lambda step, progress: task_manager.update_status(
                task_id, "processing", step, progress
            )
        )
        
        # Update final status
        task_manager.update_status(task_id, "completed", "Processing completed!", 100)
        task_manager.set_results(task_id, results)
        
    except Exception as e:
        logger.error(f"Processing failed for task {task_id}: {str(e)}")
        task_manager.update_status(task_id, "failed", f"Processing failed: {str(e)}", 0)
