"""Phase 4: Subtitle Generation Component"""

import logging
from typing import Dict, Any, Optional
from datetime import timedelta
from pipeline.config import config

logger = logging.getLogger(__name__)

class SubtitleGenerator:
    """Handles subtitle generation in multiple formats"""
    
    def __init__(self):
        self.supported_formats = ['srt', 'vtt', 'txt']
        
    async def generate_subtitles(
        self, 
        transcript: Dict[str, Any], 
        format_type: str = 'srt',
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Generate subtitles from transcript
        
        Args:
            transcript: Transcription results
            format_type: Subtitle format (srt, vtt, txt)
            progress_callback: Callback function for progress updates
            
        Returns:
            Dictionary containing subtitle results
        """
        try:
            if progress_callback:
                progress_callback("Preparing subtitle generation...", 80)
            
            if not transcript or 'segments' not in transcript:
                return self._generate_empty_subtitles(format_type)
            
            if progress_callback:
                progress_callback("Processing transcript segments...", 85)
            
            # Process segments
            processed_segments = self._process_segments(transcript['segments'])
            
            if progress_callback:
                progress_callback(f"Generating {format_type.upper()} subtitles...", 90)
            
            # Generate subtitles in requested format
            if format_type == 'srt':
                subtitle_content = self._generate_srt(processed_segments)
            elif format_type == 'vtt':
                subtitle_content = self._generate_vtt(processed_segments)
            elif format_type == 'txt':
                subtitle_content = self._generate_txt(processed_segments)
            else:
                raise SubtitleError(f"Unsupported subtitle format: {format_type}")
            
            if progress_callback:
                progress_callback("Subtitle generation completed!", 95)
            
            return {
                'subtitles': subtitle_content,
                'format': format_type,
                'segments_count': len(processed_segments),
                'duration': self._calculate_total_duration(processed_segments),
                'language': transcript.get('language', 'unknown')
            }
            
        except Exception as e:
            logger.error(f"Subtitle generation failed: {str(e)}")
            raise SubtitleError(f"Failed to generate subtitles: {str(e)}")
    
    def _process_segments(self, segments: list) -> list:
        """Process and clean transcript segments"""
        processed = []
        
        for segment in segments:
            if 'text' in segment and 'start' in segment and 'end' in segment:
                # Clean text
                text = segment['text'].strip()
                if text:
                    processed.append({
                        'start': segment['start'],
                        'end': segment['end'],
                        'text': text,
                        'duration': segment['end'] - segment['start']
                    })
        
        return processed
    
    def _generate_srt(self, segments: list) -> str:
        """Generate SRT format subtitles"""
        srt_content = []
        
        for i, segment in enumerate(segments, 1):
            start_time = self._format_timestamp_srt(segment['start'])
            end_time = self._format_timestamp_srt(segment['end'])
            
            srt_content.append(str(i))
            srt_content.append(f"{start_time} --> {end_time}")
            srt_content.append(segment['text'])
            srt_content.append("")  # Empty line between entries
        
        return "\n".join(srt_content)
    
    def _generate_vtt(self, segments: list) -> str:
        """Generate WebVTT format subtitles"""
        vtt_content = ["WEBVTT", ""]
        
        for segment in segments:
            start_time = self._format_timestamp_vtt(segment['start'])
            end_time = self._format_timestamp_vtt(segment['end'])
            
            vtt_content.append(f"{start_time} --> {end_time}")
            vtt_content.append(segment['text'])
            vtt_content.append("")
        
        return "\n".join(vtt_content)
    
    def _generate_txt(self, segments: list) -> str:
        """Generate plain text format subtitles"""
        txt_content = []
        
        for segment in segments:
            timestamp = self._format_timestamp_readable(segment['start'])
            txt_content.append(f"[{timestamp}] {segment['text']}")
        
        return "\n".join(txt_content)
    
    def _format_timestamp_srt(self, seconds: float) -> str:
        """Format timestamp for SRT format"""
        td = timedelta(seconds=seconds)
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = td.microseconds // 1000
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
    
    def _format_timestamp_vtt(self, seconds: float) -> str:
        """Format timestamp for WebVTT format"""
        td = timedelta(seconds=seconds)
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = td.microseconds // 1000
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
    
    def _format_timestamp_readable(self, seconds: float) -> str:
        """Format timestamp for readable text"""
        td = timedelta(seconds=seconds)
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes:02d}:{seconds:02d}"
    
    def _calculate_total_duration(self, segments: list) -> float:
        """Calculate total duration of subtitles"""
        if not segments:
            return 0.0
        
        return max(segment['end'] for segment in segments)
    
    def _generate_empty_subtitles(self, format_type: str) -> Dict[str, Any]:
        """Generate empty subtitle result"""
        empty_content = ""
        
        if format_type == 'vtt':
            empty_content = "WEBVTT\n\n"
        
        return {
            'subtitles': empty_content,
            'format': format_type,
            'segments_count': 0,
            'duration': 0.0,
            'language': 'unknown'
        }

class SubtitleError(Exception):
    """Custom exception for subtitle generation errors"""
    pass
