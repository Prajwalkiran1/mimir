"""Shared application state — single source of truth for singletons"""

from pipeline.orchestrator import PipelineOrchestrator
from models.task_manager import get_task_manager

orchestrator = PipelineOrchestrator()
task_manager = get_task_manager()
