"""Phase 2: Keyframe Extraction Component"""

import os
import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class KeyframeExtractor:
    """Handles keyframe extraction from video files"""
    
    def __init__(self, max_keyframes: int = 10, min_interval: int = 5):
        self.max_keyframes = max_keyframes
        self.min_interval = min_interval  # Minimum seconds between keyframes
        
    async def extract_keyframes(
        self, 
        video_path: str, 
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Extract keyframes from video file
        
        Args:
            video_path: Path to the video file
            progress_callback: Callback function for progress updates
            
        Returns:
            Dictionary containing keyframe results
        """
        try:
            if progress_callback:
                progress_callback("Initializing keyframe extraction...", 60)
            
            # Open video capture
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise KeyframeExtractionError("Failed to open video file")
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps
            
            if progress_callback:
                progress_callback("Analyzing video content...", 70)
            
            # Calculate frame intervals
            frame_interval = self._calculate_frame_interval(total_frames, fps)
            
            if progress_callback:
                progress_callback("Extracting keyframes...", 80)
            
            # Extract keyframes
            keyframes = self._extract_frames_at_intervals(
                cap, total_frames, frame_interval, fps, video_path
            )
            
            cap.release()
            
            if progress_callback:
                progress_callback("Keyframe extraction completed!", 90)
            
            return {
                'keyframes': keyframes,
                'total_frames': total_frames,
                'duration': duration,
                'fps': fps,
                'extracted_count': len(keyframes)
            }
            
        except Exception as e:
            logger.error(f"Keyframe extraction failed: {str(e)}")
            raise KeyframeExtractionError(f"Failed to extract keyframes: {str(e)}")
    
    def _calculate_frame_interval(self, total_frames: int, fps: float) -> int:
        """Calculate optimal frame interval for keyframe extraction"""
        # Ensure minimum interval
        min_frame_interval = int(self.min_interval * fps)
        
        # Calculate interval based on max keyframes
        frame_interval = max(1, total_frames // self.max_keyframes)
        
        # Use the larger of the two intervals
        return max(frame_interval, min_frame_interval)
    
    def _extract_frames_at_intervals(
        self, 
        cap: cv2.VideoCapture, 
        total_frames: int, 
        frame_interval: int, 
        fps: float,
        video_path: str
    ) -> List[Dict[str, Any]]:
        """Extract frames at calculated intervals"""
        keyframes = []
        
        for i in range(0, total_frames, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            
            if ret:
                timestamp = i / fps
                frame_filename = self._save_frame(frame, timestamp, video_path)
                
                # Analyze frame quality
                quality_score = self._analyze_frame_quality(frame)
                
                keyframe_data = {
                    'timestamp': timestamp,
                    'frame_number': i,
                    'frame_path': frame_filename,
                    'quality_score': quality_score,
                    'description': f"Keyframe at {timestamp:.2f}s"
                }
                
                keyframes.append(keyframe_data)
                
                # Limit to max_keyframes
                if len(keyframes) >= self.max_keyframes:
                    break
        
        return keyframes
    
    def _save_frame(self, frame: np.ndarray, timestamp: float, video_path: str) -> str:
        """Save frame to file and return path"""
        # Create frames directory
        video_name = Path(video_path).stem
        frames_dir = f"uploads/{video_name}/frames"
        os.makedirs(frames_dir, exist_ok=True)
        
        # Generate filename
        frame_filename = f"keyframe_{int(timestamp)}.jpg"
        frame_path = os.path.join(frames_dir, frame_filename)
        
        # Save frame
        cv2.imwrite(frame_path, frame)
        
        return frame_path
    
    def _analyze_frame_quality(self, frame: np.ndarray) -> float:
        """Analyze frame quality (sharpness, contrast, etc.)"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Calculate Laplacian variance (sharpness)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate contrast (standard deviation)
            contrast = gray.std()
            
            # Normalize and combine scores
            sharpness_score = min(laplacian_var / 1000, 1.0)  # Normalize to 0-1
            contrast_score = min(contrast / 128, 1.0)  # Normalize to 0-1
            
            # Weighted combination
            quality_score = (sharpness_score * 0.7 + contrast_score * 0.3)
            
            return quality_score
            
        except Exception as e:
            logger.warning(f"Frame quality analysis failed: {str(e)}")
            return 0.5  # Default score

class KeyframeExtractionError(Exception):
    """Custom exception for keyframe extraction errors"""
    pass
