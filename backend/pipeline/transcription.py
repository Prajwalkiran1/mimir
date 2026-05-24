"""Phase 1: Video Transcription Component

Latency is the primary concern for long videos. Transcription cost is linear in
duration, so this module uses two levers:
  1. faster-whisper BatchedInferencePipeline (batches VAD speech segments) for a
     large single-process speedup.
  2. Chunked-parallel transcription: split the audio at silence near fixed windows
     and transcribe the windows across a process pool, offsetting timestamps on
     merge. Used only for audio longer than `transcribe_parallel_min_sec`.
Both degrade gracefully to plain single-pass transcription.
"""

import os
import wave
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
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

try:
    from faster_whisper import BatchedInferencePipeline
    BATCHED_AVAILABLE = True
except ImportError:
    BATCHED_AVAILABLE = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------- #
# Process-pool worker (module-level so it is picklable under macOS 'spawn')      #
# ---------------------------------------------------------------------------- #

_WORKER_MODEL = None


def _worker_init(model_name: str, device: str, compute_type: str):
    """Load one WhisperModel per worker process (reused across that worker's chunks)."""
    global _WORKER_MODEL
    from faster_whisper import WhisperModel as _WM
    _WORKER_MODEL = _WM(model_name, device=device, compute_type=compute_type)


def _worker_transcribe(args: Tuple[str, float, int]) -> List[Dict[str, Any]]:
    """Transcribe one audio chunk and offset its timestamps to absolute video time."""
    chunk_path, offset, beam_size = args
    global _WORKER_MODEL
    seg_iter, info = _WORKER_MODEL.transcribe(
        chunk_path, beam_size=beam_size, vad_filter=True
    )
    out = [
        {"start": float(s.start) + offset, "end": float(s.end) + offset, "text": s.text}
        for s in seg_iter
    ]
    return out

class TranscriptionEngine:
    """Handles video transcription using Whisper"""
    
    def __init__(self, device: torch.device):
        self.device = device
        self.model = None
        
    def transcribe_video(self, video_path: str, progress_callback: Optional[callable] = None) -> Dict[str, Any]:
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
            
            # Transcribe (batched single-pass, or chunked-parallel for long audio)
            segments_raw, language, duration = self._transcribe_audio(audio_path)

            if progress_callback:
                progress_callback("Formatting transcription results...", 55)

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
                "language": language,
                "duration": duration,
                "word_segments": [],
                "confidence": 0.0,
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise TranscriptionError(f"Failed to transcribe video: {str(e)}")
    
    # ------------------------------------------------------------------ #
    # Transcription paths                                                  #
    # ------------------------------------------------------------------ #

    def _transcribe_audio(
        self, audio_path: str
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """Return (segments_raw, language, duration). Picks the fastest viable path."""
        duration = self._wav_duration(audio_path)
        workers = max(1, int(getattr(config, "transcribe_workers", 4)))
        parallel_min = float(getattr(config, "transcribe_parallel_min_sec", 420))

        # Chunked-parallel only pays off for long audio on multi-core machines.
        if duration >= parallel_min and workers > 1:
            try:
                return self._transcribe_parallel(audio_path, duration, workers)
            except Exception as e:
                logger.warning(f"Parallel transcription failed ({e}); single-pass fallback")

        return self._transcribe_single(audio_path, duration)

    def _transcribe_single(
        self, audio_path: str, duration: float
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """Single-process transcription, batched when faster-whisper supports it."""
        batch_size = int(getattr(config, "whisper_batch_size", 16))
        if BATCHED_AVAILABLE:
            try:
                batched = BatchedInferencePipeline(model=self.model)
                seg_iter, info = batched.transcribe(
                    audio_path, batch_size=batch_size, beam_size=1, vad_filter=True
                )
                segs = [
                    {"start": float(s.start), "end": float(s.end), "text": s.text}
                    for s in seg_iter
                ]
                return segs, info.language, (info.duration or duration)
            except Exception as e:
                logger.warning(f"Batched pipeline failed ({e}); plain transcribe")

        seg_iter, info = self.model.transcribe(audio_path, beam_size=1, vad_filter=True)
        segs = [
            {"start": float(s.start), "end": float(s.end), "text": s.text}
            for s in seg_iter
        ]
        return segs, info.language, (info.duration or duration)

    def _transcribe_parallel(
        self, audio_path: str, duration: float, workers: int
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """Split at silence near fixed windows, transcribe chunks across a process pool."""
        from concurrent.futures import ProcessPoolExecutor
        import multiprocessing as mp

        # Force 'spawn': the main process has already loaded torch/CLIP (and their
        # OpenMP/thread pools), so the Linux default 'fork' hands each worker a locked
        # mutex and deadlocks before it does any work. The workers are module-level and
        # take only picklable args, so spawn (a fresh interpreter) is safe here.
        mp_ctx = mp.get_context("spawn")

        window = int(getattr(config, "transcribe_window_sec", 300))
        split_points = self._find_split_points(audio_path, window)  # absolute seconds
        chunks = self._split_wav(audio_path, split_points)          # [(path, offset_sec)]
        if len(chunks) <= 1:
            # Nothing to parallelise; clean any temp and fall back.
            for p, _ in chunks:
                if p != audio_path:
                    self._cleanup_audio(p)
            return self._transcribe_single(audio_path, duration)

        device = "cuda" if str(self.device) == "cuda" else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        n_workers = min(workers, len(chunks))
        logger.info(
            f"Chunked-parallel transcription: {len(chunks)} chunks across {n_workers} workers "
            f"({duration:.0f}s audio, ~{window}s windows)"
        )

        tasks = [(path, offset, 1) for path, offset in chunks]
        merged: List[Dict[str, Any]] = []
        try:
            with ProcessPoolExecutor(
                max_workers=n_workers,
                mp_context=mp_ctx,
                initializer=_worker_init,
                initargs=(config.whisper_model, device, compute_type),
            ) as ex:
                for chunk_segs in ex.map(_worker_transcribe, tasks):
                    merged.extend(chunk_segs)
        finally:
            for path, _ in chunks:
                if path != audio_path:
                    self._cleanup_audio(path)

        merged.sort(key=lambda s: s["start"])
        return merged, "en", duration

    # ------------------------------------------------------------------ #
    # WAV helpers (stdlib wave + numpy — no extra dependency)              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _wav_duration(audio_path: str) -> float:
        try:
            with wave.open(audio_path, "rb") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate() or 16000
                return frames / float(rate)
        except Exception:
            return 0.0

    @staticmethod
    def _find_split_points(audio_path: str, window_sec: int) -> List[float]:
        """Find low-energy (silence) cut points near each `window_sec` boundary.

        Returns a sorted list of absolute split times in seconds (excludes 0 and end).
        Cutting at silence avoids slicing mid-word, so chunks need no overlap/dedup.
        """
        try:
            with wave.open(audio_path, "rb") as wf:
                rate = wf.getframerate() or 16000
                n = wf.getnframes()
                raw = wf.readframes(n)
        except Exception:
            return []

        if n <= 0:
            return []
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
        frame = max(1, int(0.1 * rate))  # 100 ms energy frames
        n_frames = len(samples) // frame
        if n_frames < 2:
            return []
        energy = np.abs(
            samples[: n_frames * frame].reshape(n_frames, frame)
        ).mean(axis=1)

        total_sec = len(samples) / float(rate)
        search = 15.0  # search ±15 s around each target boundary for the quietest frame
        points: List[float] = []
        target = float(window_sec)
        while target < total_sec - search:
            lo = int((target - search) * 10)
            hi = int((target + search) * 10)
            lo, hi = max(0, lo), min(n_frames, hi)
            if hi <= lo:
                break
            quietest = lo + int(np.argmin(energy[lo:hi]))
            cut = quietest / 10.0  # 10 frames per second
            if not points or cut - points[-1] > 30.0:  # avoid clustered cuts
                points.append(round(cut, 2))
            target += window_sec
        return points

    @staticmethod
    def _split_wav(audio_path: str, split_points: List[float]) -> List[Tuple[str, float]]:
        """Write sub-WAVs at the given split times. Returns [(chunk_path, offset_sec)]."""
        if not split_points:
            return [(audio_path, 0.0)]
        try:
            with wave.open(audio_path, "rb") as wf:
                params = wf.getparams()
                rate = wf.getframerate() or 16000
                n = wf.getnframes()
                raw = wf.readframes(n)
        except Exception:
            return [(audio_path, 0.0)]

        width = params.sampwidth * params.nchannels
        boundaries = [0.0] + split_points + [n / float(rate)]
        base = os.path.splitext(audio_path)[0]
        chunks: List[Tuple[str, float]] = []
        for i in range(len(boundaries) - 1):
            start_f = int(boundaries[i] * rate)
            end_f = int(boundaries[i + 1] * rate)
            if end_f <= start_f:
                continue
            chunk_path = f"{base}_chunk{i:03d}.wav"
            try:
                with wave.open(chunk_path, "wb") as out:
                    out.setparams(params)
                    out.writeframes(raw[start_f * width : end_f * width])
                chunks.append((chunk_path, round(boundaries[i], 2)))
            except Exception as e:
                logger.warning(f"Failed writing audio chunk {i}: {e}")
        return chunks or [(audio_path, 0.0)]

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
