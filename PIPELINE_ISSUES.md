# Pipeline Issues — Diagnostic Report

## Context

Live pipeline logs captured from task `8e340d24-bb00-4e5a-b5c0-99f32b60e2bd` (11m31s video, CPU-only).  
All issues confirmed from actual log output. Architecture constraints from `CLAUDE.md` must not be broken in fixes.

---

## Issue 1 — K-means cluster thrashing → 421 scenes → 403 keyframes

**Log evidence**
```
cluster_k: 47, scene_count: 421, keyframes_selected: 403
first 9 frame clusters: [7, 7, 36, 27, 4, 19, 24, 36, 7]
```

**Root cause**  
k-means has no temporal smoothness constraint. Adjacent 1-second frames jump between unrelated cluster ids every frame. `_build_scene_segments` starts a new scene on every label change → 692 frames produce 421 scenes averaging **1.64 seconds each**. With `SEC_PER_EXTRA_FRAME=15`, a 1.64s scene gets `floor(1.64/15)=0`, clamped to `MIN_FRAMES_PER_SCENE=1` → 1 keyframe per scene → 403 keyframes total.

**Fix options**

**A — Temporal label smoothing (recommended, low effort)**  
Apply a median filter over the cluster label sequence before scene segmentation. Window of 5 eliminates single-frame flickers without merging genuinely distinct scenes.
```python
from scipy.signal import medfilt
smooth_labels = medfilt(labels.astype(float), kernel_size=5).astype(int)
```
Pass `smooth_labels` to `_build_scene_segments` instead of raw `labels`.  
Expected: 421 scenes → ~50–80 scenes, 403 keyframes → ~60–90.

**B — Minimum scene duration gate**  
Only commit a scene boundary if the new cluster label persists for ≥ N consecutive frames (e.g. N=5). Micro-runs are absorbed into the previous scene.

**C — Reduce CLUSTERS_PER_MIN from 4.0 → 1.5**  
For 11 min: k = ceil(11 × 1.5) = 17 clusters. Fewer clusters = larger natural scenes. Trade-off: less visual granularity.

**D — Hard cap on total keyframes (safety net)**  
After selection: `keyframes = keyframes[:max(10, int(duration_min * 3))]`  
11 min → cap at 33. Blunt but effective as a backstop alongside A.

**Recommended:** A + D.  
**Files:** `backend/pipeline/keyframe_extraction.py` — `_cluster_frames()` (apply medfilt), `_select_and_write_keyframes()` (add cap).

---

## Issue 2 — Chunk sizes 1–21 tokens (avg ~5 tokens — far too small)

**Log evidence**
```
total_chunks: 217  (from 104 transcript segments)
chunk_sizes range: 1–21 tokens
```
217 chunks from 104 segments = ~2 chunks per segment. Each segment averages ~6 words.

**Root cause**  
Very short transcript sentences (5–6 tokens) produce unstable embeddings. Cosine similarity between consecutive short-sentence embeddings frequently drops below `SIM_THRESHOLD=0.75` even when the topic is continuous → a boundary is created at almost every sentence. This cascades into Issue 4 (tiny chunks → no SVO triples → sparse KG).

**Fix options**

**A — Enforce minimum chunk token count (recommended)**  
Don't finalize a boundary unless `buf_tokens >= MIN_CHUNK_TOKENS` (e.g. 30).
```python
MIN_CHUNK_TOKENS = 30
# in _greedy_chunk: skip boundary check if buf_tokens < MIN_CHUNK_TOKENS
```

**B — Lower SIM_THRESHOLD from 0.75 → 0.50**  
More permissive merging. Risk: chunks may span unrelated topics.

**C — Use Whisper segments as atomic chunking units (recommended alongside A)**  
Instead of splitting segments into sub-sentences before encoding, treat each Whisper segment as the smallest unit fed into the greedy loop. Segments are natural speech pauses — already sentence-like. This replaces the brittle `.?!` sentence-splitter.

**D — 3-sentence window pre-grouping**  
Bundle every 3 consecutive sentences before encoding to stabilise embeddings.

**Recommended:** A + C.  
**Files:** `backend/pipeline/semantic_chunking.py` — add `MIN_CHUNK_TOKENS`, modify `_extract_sentences()` to use segments directly, update `_greedy_chunk()` guard.

---

## Issue 3 — Vector store accumulates across uploads (critical correctness bug)

**Log evidence**
```
total_chunks: 217,  vector_index_size: 434
```
434 = 2 × 217 → two separate uploads both indexed into the same FAISS instance.

**Root cause**  
`VectorStore` is a singleton in `app_state.py`. `add_chunks()` always **appends** to the existing FAISS index — it never resets. After N uploads the index holds N × chunks entries. Since `chunk_id` encodes `video_id` (which differs per upload path), `_fuse_and_rerank`'s chunk_id deduplication cannot catch cross-upload duplicates. Result: retrieval returns the same semantic content once per upload that was run.

**Fix options**

**A — Add `reset()` and call it at the start of each task (recommended)**
```python
# vector_store.py
def reset(self):
    self.index = faiss.IndexFlatIP(self.dimension)
    self.metadata = []

# knowledge_graph.py
def reset(self):
    self.graph = nx.DiGraph()
    self.entity_mentions = {}
    self.chunk_entities = {}
```
Call both at the top of Phase 2 in `orchestrator.process_video()`.

**B — Instantiate fresh components per task**  
Create new `VectorStore()`, `KnowledgeGraph()`, `RetrievalEngine()` inside `process_video()`. Simpler. Slightly more overhead per task (model reload).

**C — Per-video_id index namespace**  
Maintain a separate FAISS index per video_id. More complex; only needed if cross-video in-memory retrieval is a future requirement.

**Recommended:** A (minimal change, correct behaviour).  
**Files:** `backend/pipeline/vector_store.py`, `backend/pipeline/knowledge_graph.py`, `backend/pipeline/orchestrator.py`.

---

## Issue 4 — Knowledge graph nearly disconnected (27 edges, 303 nodes)

**Log evidence**
```
kg_nodes: 303,  kg_edges: 27
Graph search: 1 result for general query
graph_score ≈ 0.0 for all 30 retrieved chunks
```
Average degree = 0.18. Most nodes are isolated singletons. Graph channel contributes nothing to retrieval.

**Root cause**  
spaCy SVO extraction requires complete grammatical sentences. The 1–21 token chunks (mostly noun phrases or partial utterances) don't parse into clean SVO triples → nodes are created but very few edges. Issue 2 is the upstream cause.

**Fix options**

**A — Build KG on full transcript segments, not chunks (recommended)**  
Run NER + SVO on Whisper segments directly (5–15 words each, better for parsing), then link extracted entities back to chunks by timestamp overlap. Fixes the root cause rather than patching symptoms.

**B — Add co-occurrence edges (quick fix, works independently of Issue 2)**  
If two entities appear in the same chunk, add a `"co-occurs"` edge. No need for complete sentences.
```python
for i, ent_a in enumerate(chunk_entities):
    for ent_b in chunk_entities[i+1:]:
        graph.add_edge(ent_a, ent_b, relation="co-occurs", chunk_id=chunk_id, weight=1)
```
303 nodes with avg 2 entities/chunk → ~400+ edges. Transforms the disconnected graph into a connected one.

**C — Lower relation confidence threshold**  
Accept more SVO triples by reducing the confidence cutoff in `_compute_relation_confidence`.

**Recommended:** B for immediate fix (no dependency on Issue 2 fix); A once Issue 2 is fixed.  
**Files:** `backend/pipeline/knowledge_graph.py` — `build_knowledge_graph()`.

---

## Issue 5 — Phase 1 takes 21 minutes (1280s) on CPU

**Log evidence**
```
phase1 timing_sec: 1280.95  (transcription + keyframe extraction combined)
11m31s video, CPU only
```
Keyframe extraction (old code) contributed ~5–10 min of this. The seek-based rewrite (already applied) should cut that to ~60s. Transcription is the remaining bottleneck.

**Root cause**  
Whisper `base` transcribes at ~2–4× real-time on CPU → 11 min audio = 22–44 min. `beam_size=5` adds another ~3× penalty vs greedy.

**Fix options**

**A — Switch to `whisper tiny` model**  
39M params vs 74M for `base`. 5–10× faster on CPU, acceptable English quality.  
Change: `whisper_model: str = "tiny"` in `backend/pipeline/config.py`.  
Expected: 11 min audio → 3–7 min.

**B — Set `beam_size=1` (greedy decoding)**  
~3× faster than beam_size=5 with minor quality loss.
```python
segments_iter, info = self.model.transcribe(audio_path, beam_size=1)
```

**C — Enable VAD filtering**  
`faster-whisper` has built-in VAD that skips silence. Reduces effective audio length 20–40% for lecture-style videos.
```python
segments_iter, info = self.model.transcribe(audio_path, beam_size=1, vad_filter=True)
```

**D — Run transcription and keyframe extraction in parallel**  
They are independent (transcription needs audio only; keyframe extraction needs video only). `asyncio.gather` both in Phase 1. Marginal gain since transcription dominates.

**Recommended:** A + B + C (all single-line changes, no architecture impact).  
**Files:** `backend/pipeline/config.py`, `backend/pipeline/transcription.py`.

---

## Fix Priority for Next Session

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Issue 3: `reset()` vector store + KG per task | Low | **Critical** — eliminates duplicate chunks |
| 2 | Issue 5: `tiny` + `beam_size=1` + `vad_filter=True` | Low | **High** — 21 min → ~5 min |
| 3 | Issue 1: Median-filter labels + keyframe hard cap | Low | **High** — 403 → ~30 keyframes |
| 4 | Issue 2: `MIN_CHUNK_TOKENS` + segment-level chunking | Medium | **High** — fixes tiny chunks, unblocks Issue 4 |
| 5 | Issue 4: Co-occurrence KG edges | Medium | **Medium** — activates graph retrieval channel |

## Files Summary

| Issue | Files to change |
|-------|----------------|
| 1 | `backend/pipeline/keyframe_extraction.py` |
| 2 | `backend/pipeline/semantic_chunking.py` |
| 3 | `backend/pipeline/vector_store.py`, `knowledge_graph.py`, `orchestrator.py` |
| 4 | `backend/pipeline/knowledge_graph.py` |
| 5 | `backend/pipeline/config.py`, `backend/pipeline/transcription.py` |
