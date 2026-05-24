# Mimir — Session Handoff (resume here)

_Last session: 2026-05-24. All work is **uncommitted** on disk (nothing was committed). Safe to clear the chat session — code + this doc persist._

## TL;DR status
- **Implemented** a big multimodal upgrade (on-screen OCR into summaries, chapters + chaptered MP4, hierarchical map-reduce summaries, on-demand topic summaries, chunked-parallel transcription, richer results UI). Backend compiles, frontend builds, pure-Python logic smoke-tested. **Full runtime run NOT yet done.**
- **Clean Docker run** for macOS was set up and started, but the **image build was interrupted mid-`torch` download** (426 MB, slow connection) and then stopped on request. No container/image finished. **BuildKit cache (~4.5 GB: apt layer + base + small wheels) is retained**, so resuming is fast except torch itself.
- Nothing pollutes the Mac: no Homebrew, no host Python changes. Only Docker artifacts + files inside the repo.

## How to resume the run (one block)
```bash
cd /Users/prajwalkiran/code/personal/mimir
open -a Docker                                            # start Docker Desktop daemon
# Docker Desktop → Settings → Resources: ensure ≥ 8 GB RAM
docker compose -f docker-compose.mac.yml up --build -d    # resumes from cache; torch re-downloads (auto-retries x10)
# watch: docker compose -f docker-compose.mac.yml logs -f backend   (wait for "Uvicorn running")
curl localhost:8000/health                                # expect {"status":"healthy"}
cd frontend && npm run dev                                # http://localhost:5173  (node_modules already installed)
```
- **Gemini key is already configured** in `backend/.env` (gitignored) — no action needed. Without it, summaries fall back to extractive.
- **torch is the only slow/flaky step.** `Dockerfile.mac` already has `--retries 10 --timeout 120` + a BuildKit pip cache mount, so re-running eventually gets through. If the connection keeps dropping, manually pre-download once on the host and install from file:
  `pip download torch==2.12.0 -d ./backend/wheels` then add a `COPY ./wheels /wheels` + `pip install /wheels/torch*.whl` step (optional).
- Test video already present: `ytextract/the basics of secure shell (ssh).mp4`.

## Verify (after it's up)
1. `curl localhost:8000/health` → 200.
2. `docker compose -f docker-compose.mac.yml exec backend sh -c "ffmpeg -version|head -1; tesseract --version 2>&1|head -1"` → both present.
3. UI at `:5173` → upload the SSH video → wait for "completed". Check tabs: **Video** (player + clickable **Chapters** that seek), **Chapters** (titles+summaries, on-screen code), **On-screen** (OCR'd frames), **Topic Summaries** (type a topic → Generate, no re-upload), **Download chaptered MP4**.
   - First video also downloads models (~800 MB) into the `mimir_modelcache` volume (later runs are fast).

## Full teardown (delete everything, zero residue)
```bash
docker compose -f docker-compose.mac.yml down --rmi all -v   # container + image + model volume
docker builder prune -f                                      # the 4.5 GB build cache
rm -rf frontend/node_modules frontend/dist backend/uploads backend/mimir.db
# backend/.env holds your Gemini key — delete it too if you want it gone
```
Confirm clean: `docker images|grep -i mimir` empty, `docker volume ls|grep mimir` empty, `ls ~/.cache/huggingface` absent (caches were redirected into the Docker volume, never your home dir).

---

## What changed this session (all uncommitted; `git diff` is the full record)

### New files
| File | Purpose |
|---|---|
| `backend/pipeline/visual_enrichment.py` | CLIP zero-shot frame classify + local OCR (pytesseract) + deixis ("as you can see") detection → **visual chunks** (on-screen code/text). |
| `backend/pipeline/chapter_segmentation.py` | Local chapter boundaries from transcript topic shifts ∩ visual scene cuts (no LLM). |
| `backend/pipeline/video_muxing.py` | ffmpeg `-c copy` chaptered MP4 (soft subs + chapter markers) + WebVTT chapters track. |
| `backend/pipeline/notes_assembler.py` | Structured `{task_id}_notes.md` (summary + per-chapter code/keyframes + KG glossary). |
| `backend/requirements-docker.txt` | Trimmed, Mac/CPU deps (~24 pkgs; dropped whisperx/pyannote/lightning/redis/etc. — not imported). |
| `backend/Dockerfile.mac` | Python 3.11 CPU image; apt ffmpeg+tesseract; model caches → `/cache` volume. |
| `docker-compose.mac.yml` | Backend service (port 8000), bind-mounts `./backend`, named `mimir_modelcache` volume, reads `backend/.env`. |
| `backend/.env` | `GEMINI_API_KEY` (gitignored). |

### Modified files (backend)
- `pipeline/orchestrator.py` — Phase 1 restructured (transcription ∥ keyframes→CLIP-classify→OCR); Phase 2.1 merges visual chunks (MiniLM-embedded) into the index + KG; Phase 2.3 chapter segmentation; **Phase 3 hierarchical map-reduce summary** (`_map_reduce_summary`, `_gemini_chapter_summary`, `_gemini_reduce_summary`, `_gemini_text`, `_parse_titled_summary`); Phase 4.5 mux; Phase 4.6 notes; `_run_summarization_via_retrieval(generate=…)` flag; new result keys (`chapters`, `visual_chunks`, `chaptered_video`, `notes`, `rag.num_visual_chunks`…).
- `pipeline/transcription.py` — `BatchedInferencePipeline` + chunked-parallel (`_transcribe_parallel`, silence-split via `wave`+numpy, ProcessPool, timestamp-offset merge).
- `pipeline/vector_store.py` — CLIP **image index** (`add_keyframes`, `search_images`, `embed_keyframe_images`, precomputed-embedding reuse); save/load of image index.
- `pipeline/retrieval_engine.py` — `retrieve_keyframes()` image channel.
- `pipeline/keyframe_extraction.py` — adds `phash` to each keyframe dict.
- `pipeline/config.py` — new knobs (`whisper_batch_size`, `transcribe_workers`, `enable_visual_enrichment`, `ocr_engine`, `chapter_target_*`, `map_reduce_concurrency`, …).
- `api/rag.py` — **`POST /api/v1/rag/topic-summary`** (on-demand, no re-upload) + module LRU engine loader; reuses persisted indexes.
- `api/video.py` — URL enrichment for `chaptered_video_url`, `chapters_vtt_url`, `notes_url`, `visual_chunks[].frame_url`.
- `requirements.txt` — added `pytesseract` (the full file is otherwise unchanged; **use `requirements-docker.txt` for the Mac run**).

### Modified files (frontend)
- `components/ResultsPanel.jsx` — `videoRef` + chapter seeking, **Chapters** tab, **On-screen** tab, **interactive Topic Summaries** (input → Generate → appends), chaptered-MP4 + notes downloads. (Used only icons that ship in the pinned `lucide-react@1.11.0`.)
- `services/api.js` — `getTopicSummary(taskId, topic, length)`.
- `pages/VideoUpload.jsx` — download handlers for `chaptered_video` / `notes`; fixed summary-download key.
- `frontend/node_modules`, `frontend/dist` — created by `npm install` + a successful `vite build` (gitignored).

## Verification done vs not
- ✅ `python3 -m py_compile` on all backend modules. ✅ `vite build` succeeds. ✅ Smoke tests pass for deixis/OCR-chunk/chapter-segmentation/ffmeta+vtt/notes (pure-Python, no torch).
- ❌ Not yet run end-to-end through the real ML stack (that's the Docker run above) — blocked only by the torch download.

## Design decisions (why)
Mac-only for now (host Python 3.13 lacks wheels for pinned numpy/faiss → Docker uses 3.11). Zero budget: local OCR + CLIP (no paid vision); Gemini free tier for text map-reduce only. On-screen code enters the summary via OCR'd "visual chunks" merged into retrieval + KG + the per-chapter map prompt. Full rationale in `~/.claude/plans/okay-no-i-dont-velvet-steele.md`.

## Pre-existing issues to fix before multi-user (not addressed)
Auth not enforced on endpoints; 10-task cap bricks uploads after 10; path traversal on upload filename; whole file read into RAM; two `ProcessingTask` models; singleton orchestrator races on concurrent uploads (Celery/Redis present but unused).
