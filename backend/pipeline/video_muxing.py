"""Phase 4.5: Chaptered downloadable MP4 (ffmpeg stream-copy).

Produces a single MP4 that muxes the original video + a soft subtitle track
(mov_text) + embedded chapter markers (FFMETADATA1), using `-c copy` so there is
NO re-encode — fast and free. Also emits a WebVTT 'chapters' track for the in-app
player. Entirely non-fatal: if ffmpeg is unavailable the pipeline still completes.
"""

import os
import logging
import subprocess
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def _ts_vtt(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def write_ffmetadata_file(chapters: List[Dict[str, Any]], out_path: str) -> str:
    """Write an FFMETADATA1 chapters file (millisecond timebase)."""
    lines = [";FFMETADATA1", ""]
    for ch in chapters:
        start_ms = int(round(float(ch.get("start_sec", 0.0)) * 1000))
        end_ms = int(round(float(ch.get("end_sec", 0.0)) * 1000))
        if end_ms <= start_ms:
            end_ms = start_ms + 1000
        title = str(ch.get("title") or f"Chapter {int(ch.get('index', 0)) + 1}").replace("\n", " ")
        # Escape FFMETADATA special chars
        for ch_esc in ("\\", "=", ";", "#"):
            title = title.replace(ch_esc, "\\" + ch_esc)
        lines += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={start_ms}", f"END={end_ms}",
                  f"title={title}", ""]
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path


def write_vtt_chapters(chapters: List[Dict[str, Any]], out_path: str) -> str:
    """Write a WebVTT 'chapters' track for the in-app <track kind=chapters>."""
    lines = ["WEBVTT", ""]
    for ch in chapters:
        idx = int(ch.get("index", 0)) + 1
        title = ch.get("title") or f"Chapter {idx}"
        lines += [
            str(idx),
            f"{_ts_vtt(ch.get('start_sec', 0.0))} --> {_ts_vtt(ch.get('end_sec', 0.0))}",
            str(title),
            "",
        ]
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path


def mux_chaptered_video(
    video_path: str,
    srt_path: Optional[str],
    chapters: List[Dict[str, Any]],
    output_dir: str,
    video_id: str,
) -> Optional[Dict[str, str]]:
    """Mux video + (optional) soft subs + chapter markers via ffmpeg stream-copy.

    Returns {mp4_path, vtt_chapters_path} or None on failure (non-fatal).
    """
    if not chapters or not os.path.exists(video_path):
        return None

    os.makedirs(output_dir, exist_ok=True)
    ffmeta_path = os.path.join(output_dir, f"{video_id}_ffmeta.txt")
    vtt_chapters_path = os.path.join(output_dir, f"{video_id}_chapters.vtt")
    out_path = os.path.join(output_dir, f"{video_id}_chaptered.mp4")

    try:
        write_ffmetadata_file(chapters, ffmeta_path)
        write_vtt_chapters(chapters, vtt_chapters_path)
    except Exception as e:
        logger.warning(f"Failed writing chapter metadata: {e}")
        return None

    has_subs = bool(srt_path and os.path.exists(srt_path))
    if has_subs:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", srt_path,
            "-i", ffmeta_path,
            "-map", "0:v?", "-map", "0:a?", "-map", "1:0",
            "-map_metadata", "2",
            "-c", "copy", "-c:s", "mov_text",
            "-metadata:s:s:0", "language=eng",
            out_path,
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", ffmeta_path,
            "-map", "0:v?", "-map", "0:a?",
            "-map_metadata", "1",
            "-c", "copy",
            out_path,
        ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0 or not os.path.exists(out_path):
            logger.warning(f"ffmpeg mux failed (rc={result.returncode}): {result.stderr[-400:]}")
            return {"vtt_chapters_path": vtt_chapters_path}  # VTT still usable in-app
    except FileNotFoundError:
        logger.warning("ffmpeg binary not found — skipping chaptered MP4 (VTT chapters still emitted)")
        return {"vtt_chapters_path": vtt_chapters_path}
    except Exception as e:
        logger.warning(f"ffmpeg mux error: {e}")
        return {"vtt_chapters_path": vtt_chapters_path}
    finally:
        try:
            if os.path.exists(ffmeta_path):
                os.remove(ffmeta_path)
        except Exception:
            pass

    logger.info(f"Chaptered MP4 written → {out_path}")
    return {"mp4_path": out_path, "vtt_chapters_path": vtt_chapters_path}
