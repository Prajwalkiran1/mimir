"""Configuration management for the video processing pipeline"""

from pydantic_settings import BaseSettings
from typing import Optional
import torch
import os

class PipelineConfig(BaseSettings):
    """Pipeline configuration settings"""
    
    # GPU Configuration
    use_gpu: bool = True
    cuda_visible_devices: str = "0"
    
    # Model Configuration
    whisper_model: str = "tiny"
    transformers_cache_dir: str = "models"
    spacy_model: str = "en_core_web_sm"
    
    # Processing Configuration
    max_file_size_mb: int = 500
    chunk_size_seconds: int = 30
    max_workers: int = 4
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    
    # Storage Configuration
    upload_dir: str = "uploads"
    temp_dir: str = "temp"
    redis_url: str = "redis://redis:6379"
    
    # AI API Keys
    gemini_api_key: str = ""

    # Feature Flags
    enable_transcription: bool = True
    enable_summarization: bool = True
    enable_subtitles: bool = True
    enable_keyframes: bool = True
    enable_topic_analysis: bool = True
    enable_rag: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    def setup_device(self) -> torch.device:
        """Setup and return the appropriate device"""
        if self.use_gpu and torch.cuda.is_available():
            device = torch.device("cuda")
            print(f"Using GPU: {torch.cuda.get_device_name()}")
            print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
        else:
            device = torch.device("cpu")
            print("GPU not available or disabled, using CPU")
        return device

    @property
    def device(self) -> torch.device:
        """Get the configured device"""
        return self.setup_device()

# Global configuration instance
config = PipelineConfig()
