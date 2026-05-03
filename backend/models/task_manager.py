"""Task management model for tracking video processing tasks"""

import os
import json
import logging
import sqlite3
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from pipeline.config import config

logger = logging.getLogger(__name__)


def _parse_dt(value: str) -> datetime:
    """Parse datetime from either isoformat (T separator) or SQLite CURRENT_TIMESTAMP (space separator)."""
    if not value:
        return datetime.now()
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        # SQLite CURRENT_TIMESTAMP format: "2025-02-10 14:23:45"
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


class TaskStatus(Enum):
    """Task status enumeration"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ProcessingTask:
    """Represents a video processing task"""
    
    def __init__(self, task_id: str, video_path: str, options: Dict[str, Any]):
        self.task_id = task_id
        self.video_path = video_path
        self.options = options
        self.status = TaskStatus.QUEUED
        self.progress = 0
        self.current_step = "Queued for processing..."
        self.results = None
        self.error = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.completed_at = None
    
    def update_status(self, status: TaskStatus, step: str, progress: int):
        """Update task status"""
        self.status = status
        self.current_step = step
        self.progress = progress
        self.updated_at = datetime.now()
        
        if status == TaskStatus.COMPLETED:
            self.completed_at = datetime.now()
        elif status == TaskStatus.FAILED:
            self.error = step
    
    def set_results(self, results: Dict[str, Any]):
        """Set task results"""
        self.results = results
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            'task_id': self.task_id,
            'video_path': os.path.basename(self.video_path),
            'status': self.status.value,
            'progress': self.progress,
            'current_step': self.current_step,
            'results': self.results,
            'error': self.error,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class TaskManager:
    """Task manager for processing tasks with database persistence"""
    
    def __init__(self):
        self.db_path = "mimir.db"
        self.max_tasks = 10
        self.tasks = {}
        self._init_database()
        self._load_tasks()
    
    def _init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if table exists and has the right structure
        cursor.execute('SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"processing_tasks\"')
        table_exists = cursor.fetchone()
        
        if not table_exists:
            cursor.execute('''
                CREATE TABLE processing_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id VARCHAR(36) UNIQUE,
                    user_id INTEGER,
                    filename VARCHAR(255),
                    file_size INTEGER,
                    status VARCHAR(20),
                    progress INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME,
                    error_message TEXT,
                    processing_options TEXT,
                    results TEXT
                )
            ''')
            conn.commit()
            logger.info("Created new processing_tasks table")
        else:
            logger.info("Using existing processing_tasks table")
        
        conn.close()
    
    def _load_tasks(self):
        """Load tasks from database into memory cache"""
        self.tasks = {}
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM processing_tasks ORDER BY created_at DESC')
        rows = cursor.fetchall()
        
        for row in rows:
            # Map to existing table structure
            id, task_id, user_id, filename, file_size, status, progress, created_at, updated_at, completed_at, error_message, processing_options, results = row
            
            # Create a mock video path from filename
            video_path = f"uploads/{task_id}/{filename}" if filename else f"uploads/{task_id}/video.mp4"
            
            task = ProcessingTask(task_id, video_path, json.loads(processing_options) if processing_options else {})
            task.status = TaskStatus(status)
            task.progress = progress
            task.current_step = error_message or "Processing..."
            task.created_at = _parse_dt(created_at)
            task.updated_at = _parse_dt(updated_at)

            if completed_at:
                task.completed_at = _parse_dt(completed_at)
            
            if results:
                task.results = json.loads(results)
            
            self.tasks[task_id] = task
        
        conn.close()
        logger.info(f"Loaded {len(self.tasks)} tasks from database")
    
    def _save_task(self, task: ProcessingTask):
        """Save task to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Extract filename from video path
        filename = os.path.basename(task.video_path) if task.video_path else "video.mp4"
        
        cursor.execute('''
            INSERT OR REPLACE INTO processing_tasks 
            (task_id, filename, file_size, status, progress, created_at, updated_at, completed_at, error_message, processing_options, results)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task.task_id,
            filename,
            0,  # Default file_size
            task.status.value,
            task.progress,
            task.created_at.isoformat(),
            task.updated_at.isoformat(),
            task.completed_at.isoformat() if task.completed_at else None,
            task.current_step if task.current_step != "Processing..." else None,
            json.dumps(task.options),
            json.dumps(task.results) if task.results else None
        ))
        
        conn.commit()
        conn.close()
        
    def create_task(self, task_id: str, video_path: str, options: Dict[str, Any]) -> ProcessingTask:
        """Create a new processing task"""
        if len(self.tasks) >= self.max_tasks:
            raise Exception("Maximum concurrent tasks reached")
        
        if task_id in self.tasks:
            raise Exception(f"Task {task_id} already exists")
        
        task = ProcessingTask(task_id, video_path, options)
        self.tasks[task_id] = task
        self._save_task(task)
        
        logger.info(f"Created task {task_id} for video {video_path}")
        return task
    
    def get_task(self, task_id: str) -> Optional[ProcessingTask]:
        """Get task by ID"""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> List[ProcessingTask]:
        """Get all tasks"""
        return list(self.tasks.values())
    
    def update_status(self, task_id: str, status: str, step: str, progress: int):
        """Update task status"""
        task = self.get_task(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found for status update")
            return
        
        try:
            status_enum = TaskStatus(status)
            task.update_status(status_enum, step, progress)
            self._save_task(task)
            logger.debug(f"Updated task {task_id} status to {status} ({progress}%)")
        except ValueError:
            logger.error(f"Invalid status {status} for task {task_id}")
    
    def set_results(self, task_id: str, results: Dict[str, Any]):
        """Set task results"""
        task = self.get_task(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found for results")
            return
        
        task.set_results(results)
        self._save_task(task)
        logger.info(f"Task {task_id} completed successfully")
    
    def cleanup_task(self, task_id: str):
        """Clean up task and associated files"""
        task = self.get_task(task_id)
        if not task:
            return
        
        # Remove files
        try:
            video_dir = os.path.dirname(task.video_path)
            if os.path.exists(video_dir):
                import shutil
                shutil.rmtree(video_dir)
                logger.info(f"Cleaned up files for task {task_id}")
        except Exception as e:
            logger.error(f"Failed to cleanup files for task {task_id}: {str(e)}")
        
        # Remove task from memory and database
        if task_id in self.tasks:
            del self.tasks[task_id]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM processing_tasks WHERE task_id = ?', (task_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"Cleaned up task {task_id}")
    
    def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks"""
        current_time = datetime.now()
        tasks_to_remove = []
        
        for task_id, task in self.tasks.items():
            if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and 
                task.completed_at and 
                (current_time - task.completed_at).total_seconds() > max_age_hours * 3600):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            self.cleanup_task(task_id)
        
        if tasks_to_remove:
            logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")

    def get_statistics(self) -> Dict[str, Any]:
        """Get task statistics"""
        stats = {
            'total_tasks': len(self.tasks),
            'by_status': {},
            'average_completion_time': 0
        }
        
        completion_times = []
        
        for status in TaskStatus:
            count = sum(1 for task in self.tasks.values() if task.status == status)
            stats['by_status'][status.value] = count
        
        for task in self.tasks.values():
            if task.completed_at and task.created_at:
                completion_time = (task.completed_at - task.created_at).total_seconds()
                completion_times.append(completion_time)
        
        if completion_times:
            stats['average_completion_time'] = sum(completion_times) / len(completion_times)

        return stats


_task_manager_instance = None


def get_task_manager() -> TaskManager:
    global _task_manager_instance
    if _task_manager_instance is None:
        _task_manager_instance = TaskManager()
    return _task_manager_instance
