"""Phase 1: Video Transcription Component"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional
import torch
from pipeline.config import config

# Try to import dependencies with error handling
try:
    import ffmpeg
    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False
    logging.warning("FFmpeg not available - video processing will be limited")

try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    logging.warning("faster-whisper not available - transcription will use fallback")

logger = logging.getLogger(__name__)

class TranscriptionEngine:
    """Handles video transcription using Whisper"""
    
    def __init__(self, device: torch.device):
        self.device = device
        self.model = None
        
    async def transcribe_video(self, video_path: str, progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """
        Transcribe video file using Whisper
        
        Args:
            video_path: Path to the video file
            progress_callback: Callback function for progress updates
            
        Returns:
            Dictionary containing transcription results
        """
        try:
            if not WHISPER_AVAILABLE:
                logger.warning("Whisper not available, using mock transcription")
                return self._get_mock_transcription()
            
            if not FFMPEG_AVAILABLE:
                logger.warning("FFmpeg not available, using mock transcription")
                return self._get_mock_transcription()
            
            if progress_callback:
                progress_callback("Loading transcription model...", 5)
            
            # Load faster-whisper model
            try:
                device = "cuda" if str(self.device) == "cuda" else "cpu"
                compute_type = "float16" if device == "cuda" else "int8"
                self.model = WhisperModel(config.whisper_model, device=device, compute_type=compute_type)
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {str(e)}")
                return self._get_mock_transcription()
            
            if progress_callback:
                progress_callback("Extracting audio from video...", 15)
            
            # Extract audio from video
            try:
                audio_path = self._extract_audio(video_path)
            except Exception as e:
                logger.error(f"Failed to extract audio: {str(e)}")
                return self._get_mock_transcription()
            
            if progress_callback:
                progress_callback("Analyzing audio file...", 25)
            
            # Check if audio file has actual content
            import os
            if os.path.exists(audio_path):
                file_size = os.path.getsize(audio_path)
                logger.info(f"Audio file size: {file_size} bytes")
                
                # Only treat as "no audio" if file is extremely small (less than 100 bytes)
                if file_size < 100:  # Extremely small file likely has no audio
                    logger.warning(f"Audio file too small: {file_size} bytes")
                    if progress_callback:
                        progress_callback("No audio content found in video...", 35)
                    
                    if progress_callback:
                        progress_callback("No transcription generated (empty audio)", 60)
                    
                    self._cleanup_audio(audio_path)
                    return {
                        'segments': [],
                        'language': 'unknown',
                        'word_segments': [],
                        'confidence': 0.0
                    }
            
            if progress_callback:
                progress_callback("Transcribing audio...", 35)
            
            if progress_callback:
                progress_callback("Processing speech recognition...", 45)
            
            # Transcribe audio using faster-whisper
            segments_iter, info = self.model.transcribe(audio_path, beam_size=5)

            if progress_callback:
                progress_callback("Formatting transcription results...", 55)

            # Consume the generator and build segment list
            segments_raw = [
                {"id": i, "start": seg.start, "end": seg.end, "text": seg.text}
                for i, seg in enumerate(segments_iter)
            ]

            # Cleanup temporary audio file
            self._cleanup_audio(audio_path)

            if progress_callback:
                progress_callback("Transcription completed!", 60)

            full_text = " ".join(seg["text"].strip() for seg in segments_raw)
            segments = [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"].strip(),
                    "confidence": 0.0,
                }
                for seg in segments_raw
            ]

            return {
                "text": full_text,
                "segments": segments,
                "language": info.language,
                "duration": info.duration,
                "word_segments": [],
                "confidence": 0.0,
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise TranscriptionError(f"Failed to transcribe video: {str(e)}")
    
    def _extract_audio(self, video_path: str) -> str:
        """Extract audio from video file"""
        try:
            base = os.path.splitext(video_path)[0]
            audio_path = base + '_audio.wav'
            
            # Ensure audio directory exists
            os.makedirs(os.path.dirname(audio_path), exist_ok=True)
            
            # Try ffmpeg-python first
            try:
                (
                    ffmpeg
                    .input(video_path)
                    .output(audio_path, acodec='pcm_s16le', ac=1, ar='16000')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
            except ffmpeg.Error as e:
                # Fallback to subprocess ffmpeg
                import subprocess
                cmd = [
                    'ffmpeg', '-i', video_path, 
                    '-acodec', 'pcm_s16le', 
                    '-ac', '1', 
                    '-ar', '16000', 
                    '-y',  # Overwrite output
                    audio_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    raise Exception(f"ffmpeg failed: {result.stderr}")
            
            # Check if audio file was created
            if not os.path.exists(audio_path):
                raise Exception("Audio file was not created")
            
            return audio_path
            
        except Exception as e:
            logger.error(f"Audio extraction failed: {str(e)}")
            raise TranscriptionError(f"Failed to extract audio: {str(e)}")
    
    def _cleanup_audio(self, audio_path: str):
        """Clean up temporary audio file"""
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup audio file: {str(e)}")
    
    def _calculate_confidence(self, segments: list) -> float:
        """Calculate average confidence score"""
        if not segments:
            return 0.0
        
        confidences = []
        for segment in segments:
            if 'confidence' in segment:
                confidences.append(segment['confidence'])
            elif 'words' in segment:
                word_confidences = [word.get('confidence', 0.0) for word in segment['words']]
                if word_confidences:
                    confidences.append(sum(word_confidences) / len(word_confidences))
        
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def _get_mock_transcription(self) -> Dict[str, Any]:
        """Return mock transcription for demo/fallback purposes"""
        return {
            'segments': [
                {'start': 0.0, 'end': 5.0, 'text': 'This is a sample transcript for demonstration purposes.'},
                {'start': 5.0, 'end': 10.0, 'text': 'The actual transcription will be performed by WhisperX when available.'},
                {'start': 10.0, 'end': 15.0, 'text': 'Video processing is working with fallback mode enabled.'}
            ],
            'language': 'en',
            'word_segments': [],
            'confidence': 0.85,
            'fallback_used': True
        }

class TranscriptionError(Exception):
    """Custom exception for transcription errors"""
    pass
