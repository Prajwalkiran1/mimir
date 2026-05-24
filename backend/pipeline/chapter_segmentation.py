"""Unified chapter segmentation (local, no LLM).

A strong chapter boundary is where a transcript topic shift (semantic-chunk break)
coincides with a visual scene cut. We greedily grow chapters to a target duration,
closing at the first topic boundary that aligns with a scene change once past the
minimum, or forcing a cut at the maximum. Titles/summaries are filled later by the
map-reduce step; this module only produces spans + the chunk ids they contain.
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def segment_into_chapters(
    semantic_chunks: List[Dict[str, Any]],
    scene_segments: List[Dict[str, Any]],
    duration: float,
    target_min_sec: int = 180,
    target_max_sec: int = 480,
    scene_tolerance_sec: float = 6.0,
) -> List[Dict[str, Any]]:
    """Return [{index, start_sec, end_sec, chunk_ids}] covering the whole timeline."""
    duration = float(duration or 0.0)
    if not semantic_chunks:
        return [{"index": 0, "start_sec": 0.0, "end_sec": duration, "chunk_ids": []}]

    chunks = sorted(semantic_chunks, key=lambda c: float(c.get("time_start", 0.0)))
    scene_starts = sorted(float(s.get("start_sec", 0.0)) for s in (scene_segments or []))

    def near_scene(t: float) -> bool:
        return any(abs(t - ss) <= scene_tolerance_sec for ss in scene_starts)

    chapters: List[Dict[str, Any]] = []
    idx = 0
    cur_start = float(chunks[0].get("time_start", 0.0))
    cur_ids: List[str] = []

    for i, c in enumerate(chunks):
        cur_ids.append(c.get("chunk_id", ""))
        c_end = float(c.get("time_end", c.get("time_start", 0.0)))
        nxt = chunks[i + 1] if i + 1 < len(chunks) else None

        if nxt is None:
            chapters.append({
                "index": idx, "start_sec": round(cur_start, 2),
                "end_sec": round(c_end, 2), "chunk_ids": cur_ids,
            })
            break

        nxt_start = float(nxt.get("time_start", c_end))
        cur_dur = c_end - cur_start
        strong_boundary = near_scene(nxt_start)
        if (cur_dur >= target_min_sec and strong_boundary) or (cur_dur >= target_max_sec):
            chapters.append({
                "index": idx, "start_sec": round(cur_start, 2),
                "end_sec": round(nxt_start, 2), "chunk_ids": cur_ids,
            })
            idx += 1
            cur_start = nxt_start
            cur_ids = []

    # Anchor the ends so the chapters tile the full video.
    if chapters:
        chapters[0]["start_sec"] = 0.0
        if duration > chapters[-1]["end_sec"]:
            chapters[-1]["end_sec"] = round(duration, 2)
    logger.info(f"Segmented into {len(chapters)} chapters")
    return chapters
