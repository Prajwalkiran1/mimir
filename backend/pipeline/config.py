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

    # Transcription performance (latency is the primary concern for long videos)
    whisper_batch_size: int = 16          # BatchedInferencePipeline batch size
    transcribe_workers: int = 4           # parallel processes for long audio
    transcribe_window_sec: int = 300      # ~5 min windows for chunked-parallel
    transcribe_parallel_min_sec: int = 420  # only parallelise audio longer than this

    # Visual enrichment (CLIP frame-filter + local OCR — free, no rate limit)
    enable_visual_enrichment: bool = True
    ocr_engine: str = "tesseract"         # 'tesseract' | 'easyocr'
    ocr_max_workers: int = 4
    ocr_min_chars: int = 12               # ignore frames whose OCR text is shorter

    # Chapters + map-reduce summarisation
    enable_chapters: bool = True
    chapter_target_min_sec: int = 300     # ~5 min minimum chapter (bounds Gemini call count)
    chapter_target_max_sec: int = 900     # ~15 min maximum chapter
    map_reduce_concurrency: int = 3       # concurrent per-chapter Gemini calls (free-tier RPM)

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
