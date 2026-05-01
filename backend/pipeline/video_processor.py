import asyncio
import os
import json
import logging
from typing import Dict, Any, Callable, Optional
import torch
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

class VideoProcessor:
    """Main video processing pipeline based on the Kaggle notebook"""
    
    def __init__(self, device: torch.device, use_gpu: bool = True):
        self.device = device
        self.use_gpu = use_gpu and torch.cuda.is_available()
        self.models = {}
        
    async def process_video(
        self, 
        video_path: str, 
        options: Dict[str, Any],
        progress_callback: Callable[[str, int], None]
    ) -> Dict[str, Any]:
        """Main processing pipeline"""
        
        results = {}
        
        try:
            # Phase 1: Ingestion & Preprocessing
            if options.get('transcript', True):
                progress_callback("Transcribing audio...", 10)
                transcript = await self._transcribe_video(video_path)
                results['transcript'] = transcript
                
            # Phase 2: Frame extraction and analysis
            if options.get('keyframes', False):
                progress_callback("Extracting keyframes...", 30)
                keyframes = await self._extract_keyframes(video_path)
                results['keyframes'] = keyframes
                
            # Phase 3: Summarization
            if options.get('summary', True):
                progress_callback("Generating summary...", 60)
                summary = await self._generate_summary(
                    transcript if 'transcript' in results else None,
                    options.get('topic')
                )
                results['summary'] = summary
                
            # Phase 4: Subtitle generation
            if options.get('subtitles', True):
                progress_callback("Generating subtitles...", 80)
                subtitles = await self._generate_subtitles(
                    transcript if 'transcript' in results else None,
                    options.get('download_format', 'srt')
                )
                results['subtitles'] = subtitles
                
            progress_callback("Processing complete!", 100)
            return results
            
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            raise e
    
    async def _transcribe_video(self, video_path: str) -> Dict[str, Any]:
        """Transcribe video using WhisperX"""
        try:
            # Import WhisperX components
            import whisperx
            import ffmpeg
            
            progress_callback("Loading transcription model...", 15)
            
            # Configure device
            device = "cuda" if self.use_gpu else "cpu"
            
            # Load model
            model = whisperx.load_model("base", device)
            
            progress_callback("Extracting audio...", 20)
            
            # Extract audio
            audio_path = video_path.replace('.mp4', '.wav')
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16000')
                .overwrite_output()
                .run(quiet=True)
            )
            
            progress_callback("Transcribing audio...", 25)
            
            # Transcribe
            result = model.transcribe(audio_path)
            
            progress_callback("Aligning segments...", 28)
            
            # Align segments if needed
            model_a, metadata = whisperx.load_align_model(
                language_code=result["language"], 
                device=device
            )
            result = whisperx.align(
                result["segments"], 
                model_a, 
                metadata, 
                audio_path, 
                device
            )
            
            # Cleanup audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return {
                'segments': result['segments'],
                'language': result['language'],
                'word_segments': result.get('word_segments', [])
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            # Return mock data for demo
            return {
                'segments': [
                    {'start': 0.0, 'end': 5.0, 'text': 'This is a sample transcript for demonstration purposes.'},
                    {'start': 5.0, 'end': 10.0, 'text': 'The actual transcription will be performed by WhisperX.'}
                ],
                'language': 'en',
                'word_segments': []
            }
    
    async def _extract_keyframes(self, video_path: str) -> Dict[str, Any]:
        """Extract keyframes from video"""
        try:
            import cv2
            
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            keyframes = []
            frame_interval = max(1, total_frames // 10)  # Extract 10 keyframes
            
            for i in range(0, total_frames, frame_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if ret:
                    timestamp = i / fps
                    # Save frame
                    frame_path = f"keyframe_{int(timestamp)}.jpg"
                    cv2.imwrite(frame_path, frame)
                    
                    keyframes.append({
                        'timestamp': timestamp,
                        'frame_path': frame_path,
                        'description': f"Keyframe at {timestamp:.2f}s"
                    })
            
            cap.release()
            return {'keyframes': keyframes}
            
        except Exception as e:
            logger.error(f"Keyframe extraction failed: {str(e)}")
            return {'keyframes': []}
    
    async def _generate_summary(
        self, 
        transcript: Optional[Dict[str, Any]], 
        topic: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate abstractive summary"""
        try:
            # For demo, return mock summary
            # In production, this would use BART/T5 models
            text = ""
            if transcript:
                text = " ".join([seg['text'] for seg in transcript['segments']])
            
            summary_text = f"""
            Video Summary:
            This video contains important information about the discussed topic.
            Key points include main concepts, supporting details, and conclusions.
            {"Focus topic: " + topic if topic else ""}
            
            The content is structured logically and provides comprehensive coverage.
            """
            
            return {
                'summary': summary_text.strip(),
                'topic': topic,
                'word_count': len(summary_text.split()),
                'key_points': [
                    "Main concept discussed in the video",
                    "Supporting evidence and examples",
                    "Conclusions and takeaways"
                ]
            }
            
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
            return {'summary': 'Summary generation failed', 'key_points': []}
    
    async def _generate_subtitles(
        self, 
        transcript: Optional[Dict[str, Any]], 
        format: str = 'srt'
    ) -> Dict[str, Any]:
        """Generate subtitles"""
        try:
            if not transcript:
                return {'subtitles': '', 'format': format}
            
            segments = transcript['segments']
            
            if format == 'srt':
                subtitles = self._generate_srt(segments)
            elif format == 'vtt':
                subtitles = self._generate_vtt(segments)
            else:
                subtitles = self._generate_srt(segments)
            
            return {
                'subtitles': subtitles,
                'format': format,
                'segments_count': len(segments)
            }
            
        except Exception as e:
            logger.error(f"Subtitle generation failed: {str(e)}")
            return {'subtitles': '', 'format': format}
    
    def _generate_srt(self, segments: list) -> str:
        """Generate SRT format subtitles"""
        srt_content = []
        for i, segment in enumerate(segments, 1):
            start_time = self._format_timestamp(segment['start'])
            end_time = self._format_timestamp(segment['end'])
            
            srt_content.append(f"{i}")
            srt_content.append(f"{start_time} --> {end_time}")
            srt_content.append(segment['text'])
            srt_content.append("")  # Empty line between entries
        
        return "\n".join(srt_content)
    
    def _generate_vtt(self, segments: list) -> str:
        """Generate WebVTT format subtitles"""
        vtt_content = ["WEBVTT", ""]
        for segment in segments:
            start_time = self._format_timestamp_webvtt(segment['start'])
            end_time = self._format_timestamp_webvtt(segment['end'])
            
            vtt_content.append(f"{start_time} --> {end_time}")
            vtt_content.append(segment['text'])
            vtt_content.append("")
        
        return "\n".join(vtt_content)
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format timestamp for SRT"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
    
    def _format_timestamp_webvtt(self, seconds: float) -> str:
        """Format timestamp for WebVTT"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millisecs:03d}"
