import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Play, FileText, Brain, Image, Search, CheckCircle, BarChart2,
} from 'lucide-react';
import apiService from '../services/api';

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ─── Self-contained styles ──────────────────────────────────────────────────── */
const PanelStyles = () => (
  <style>{`
    .rp-wrap {
      animation: rpRiseIn 0.55s cubic-bezier(0.23,1,0.32,1) both;
      font-family: 'DM Sans', sans-serif;
    }
    @keyframes rpRiseIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Success bar */
    .rp-success-bar {
      display: flex; align-items: center; gap: 14px;
      background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.18);
      border-radius: 14px; padding: 14px 20px; margin-bottom: 24px;
    }
    .rp-success-icon {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .rp-success-title { font-size: 0.92rem; font-weight: 500; color: #86efac; }
    .rp-success-sub { font-size: 0.78rem; color: rgba(134,239,172,0.65); margin-top: 2px; }

    /* Tab bar */
    .rp-tabs {
      display: flex; gap: 4px;
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.18);
      border-bottom: none;
      border-radius: 18px 18px 0 0;
      padding: 6px 6px 0 6px;
      overflow-x: auto;
    }
    .rp-tabs::-webkit-scrollbar { height: 0; }

    .rp-tab-btn {
      font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
      padding: 9px 18px; border-radius: 12px 12px 0 0;
      border: none; background: transparent; color: rgba(220, 195, 130, 0.5);
      cursor: pointer; white-space: nowrap;
      display: flex; align-items: center; gap: 7px;
      transition: all 0.22s ease; position: relative;
      border-bottom: 2px solid transparent;
    }
    .rp-tab-btn:hover { color: rgba(248, 235, 190, 0.82); background: rgba(201, 168, 76, 0.05); }
    .rp-tab-btn.active {
      color: #fdf8ee;
      background: rgba(20, 35, 55, 0.50);
      border-bottom-color: #c9a84c;
    }
    .rp-tab-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #c9a84c; opacity: 0;
      transition: opacity 0.2s;
    }
    .rp-tab-btn.active .rp-tab-dot { opacity: 1; }

    /* Panel */
    .rp-panel {
      background: rgba(20, 35, 55, 0.50);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid rgba(201, 168, 76, 0.18);
      border-top: none;
      border-radius: 0 0 28px 28px;
      overflow: hidden;
      min-height: 360px;
    }
    .rp-panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 26px;
      border-bottom: 1px solid rgba(201, 168, 76, 0.08);
    }
    .rp-panel-title {
      display: flex; align-items: center; gap: 10px;
      font-family: 'DM Serif Display', Georgia, serif; font-size: 1.1rem; color: #fdf8ee;
    }
    .rp-panel-title-icon {
      width: 34px; height: 34px; border-radius: 10px;
      background: rgba(201, 168, 76, 0.1);
      border: 1px solid rgba(201, 168, 76, 0.22);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .rp-panel-actions { display: flex; align-items: center; gap: 8px; }

    .rp-icon-btn {
      width: 34px; height: 34px; border-radius: 9px;
      background: rgba(201, 168, 76, 0.07);
      border: 1px solid rgba(201, 168, 76, 0.18);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #c9a84c; transition: all 0.2s;
    }
    .rp-icon-btn:hover { background: rgba(201, 168, 76, 0.16); border-color: rgba(201, 168, 76, 0.45); }

    .rp-panel-body { padding: 24px 26px; }

    /* Transcript */
    .rp-transcript-body {
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.08);
      border-radius: 14px;
      padding: 20px 22px;
      max-height: 420px; overflow-y: auto;
      font-family: 'Menlo', 'Consolas', monospace;
      font-size: 0.82rem; color: rgba(248, 235, 190, 0.82);
      line-height: 1.8; letter-spacing: 0.01em;
      white-space: pre-wrap; word-wrap: break-word;
    }

    /* Video */
    .rp-video-container {
      border-radius: 14px; overflow: hidden;
      background: #000;
      border: 1px solid rgba(201, 168, 76, 0.18);
      aspect-ratio: 16 / 9; position: relative;
    }
    .rp-video-container video { width: 100%; height: 100%; display: block; outline: none; }
    .rp-video-fallback {
      display: flex; align-items: center; justify-content: center; height: 100%;
      color: rgba(220, 195, 130, 0.5); font-size: 0.84rem;
    }

    .rp-srt-toggle-row { margin-top: 14px; display: flex; align-items: center; gap: 8px; }
    .rp-srt-toggle-btn {
      font-family: 'DM Sans', sans-serif; font-size: 0.76rem; color: rgba(201, 168, 76, 0.55);
      cursor: pointer; background: none; border: none; padding: 0;
      transition: color 0.2s; display: inline-flex; align-items: center; gap: 6px;
    }
    .rp-srt-toggle-btn:hover { color: #c9a84c; }
    .rp-srt-raw-box {
      margin-top: 12px; max-height: 180px; overflow-y: auto;
      background: rgba(5, 10, 20, 0.6);
      border: 1px solid rgba(201, 168, 76, 0.18);
      border-radius: 10px; padding: 14px;
    }
    .rp-srt-raw-box pre {
      font-family: 'Menlo', 'Consolas', monospace; font-size: 0.76rem;
      color: rgba(248, 235, 190, 0.82); white-space: pre-wrap; line-height: 1.6;
    }

    /* Summary */
    .rp-summary-layout { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 640px) { .rp-summary-layout { grid-template-columns: 3fr 2fr; } }

    .rp-summary-text-block {
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.08);
      border-radius: 14px; padding: 20px 22px;
      font-size: 0.88rem; color: rgba(248, 235, 190, 0.82); line-height: 1.8; font-weight: 300;
      max-height: 360px; overflow-y: auto;
      white-space: pre-wrap; word-wrap: break-word;
    }

    .rp-keypoints-block {
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.08);
      border-radius: 14px; padding: 18px 20px;
      max-height: 360px; overflow-y: auto;
    }
    .rp-keypoints-label {
      font-size: 0.6rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: rgba(201, 168, 76, 0.55);
      margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
    }
    .rp-keypoints-label::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: rgba(201, 168, 76, 0.55); }

    .rp-keypoint-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 9px 0; border-bottom: 1px solid rgba(201, 168, 76, 0.07);
      font-size: 0.82rem; color: rgba(248, 235, 190, 0.82); line-height: 1.55;
    }
    .rp-keypoint-item:last-child { border-bottom: none; padding-bottom: 0; }
    .rp-keypoint-bullet {
      width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
      background: rgba(201, 168, 76, 0.12);
      border: 1px solid rgba(201, 168, 76, 0.28);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6rem; font-weight: 700; color: #c9a84c; font-family: 'Menlo', monospace;
    }

    /* Badges */
    .rp-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .rp-badge {
      font-size: 0.6rem; font-weight: 500; letter-spacing: 0.12em;
      text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
    }
    .rp-badge-teal {
      background: rgba(201, 168, 76, 0.1);
      color: #c9a84c;
      border: 1px solid rgba(201, 168, 76, 0.22);
    }
    .rp-badge-dim {
      background: rgba(220, 195, 130, 0.06);
      color: rgba(220, 195, 130, 0.5);
      border: 1px solid rgba(201, 168, 76, 0.18);
    }

    /* Keyframes */
    .rp-kf-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 10px;
    }
    .rp-kf-cell {
      position: relative; border-radius: 10px; overflow: hidden;
      border: 1px solid rgba(201, 168, 76, 0.18);
      background: rgba(0, 0, 0, 0.5);
      aspect-ratio: 16/9; cursor: pointer; text-decoration: none;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .rp-kf-cell:hover {
      transform: scale(1.04);
      border-color: rgba(201, 168, 76, 0.5);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }
    .rp-kf-cell img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      transition: transform 0.4s ease;
    }
    .rp-kf-cell:hover img { transform: scale(1.06); }
    .rp-kf-time {
      position: absolute; bottom: 6px; left: 6px;
      background: rgba(10, 15, 26, 0.88); backdrop-filter: blur(8px);
      border: 1px solid rgba(201, 168, 76, 0.18);
      color: #c9a84c;
      font-family: 'Menlo','Consolas',monospace; font-size: 0.68rem; font-weight: 500;
      padding: 2px 7px; border-radius: 100px;
    }
    .rp-kf-empty {
      padding: 48px 16px; text-align: center;
      color: rgba(220, 195, 130, 0.5); font-style: italic; font-size: 0.86rem; font-weight: 300;
    }

    /* RAG */
    .rp-rag-body {
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.08);
      border-radius: 14px; padding: 20px 22px;
      font-size: 0.88rem; color: rgba(248, 235, 190, 0.82); line-height: 1.8; font-weight: 300;
      max-height: 420px; overflow-y: auto;
      white-space: pre-wrap; word-wrap: break-word;
    }

    /* Chapters */
    .rp-chapters { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .rp-chapter {
      display: flex; gap: 12px; align-items: flex-start;
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.10);
      border-radius: 12px; padding: 12px 14px; text-align: left; width: 100%;
      cursor: pointer; transition: all 0.18s ease; font-family: 'DM Sans', sans-serif;
    }
    .rp-chapter:hover { border-color: rgba(201, 168, 76, 0.4); background: rgba(20, 35, 55, 0.5); }
    .rp-chapter-ts {
      font-family: 'Menlo','Consolas',monospace; font-size: 0.72rem; color: #c9a84c;
      background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2);
      border-radius: 7px; padding: 3px 8px; flex-shrink: 0; margin-top: 2px;
    }
    .rp-chapter-title { font-size: 0.9rem; color: #fdf8ee; font-weight: 500; }
    .rp-chapter-sum { font-size: 0.8rem; color: rgba(248,235,190,0.7); line-height: 1.55; margin-top: 4px; }
    .rp-chapter-kp { margin: 6px 0 0; padding-left: 16px; }
    .rp-chapter-kp li { font-size: 0.78rem; color: rgba(248,235,190,0.7); line-height: 1.5; }

    /* On-screen / visual chunks */
    .rp-visual-card {
      display: grid; grid-template-columns: 200px 1fr; gap: 14px;
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid rgba(201, 168, 76, 0.10);
      border-radius: 12px; padding: 12px; margin-bottom: 12px;
    }
    @media (max-width: 640px) { .rp-visual-card { grid-template-columns: 1fr; } }
    .rp-visual-card img { width: 100%; border-radius: 8px; border: 1px solid rgba(201,168,76,0.18); }
    .rp-visual-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .rp-visual-text {
      font-family: 'Menlo','Consolas',monospace; font-size: 0.74rem;
      color: rgba(248,235,190,0.85); white-space: pre-wrap; word-break: break-word;
      max-height: 220px; overflow-y: auto; line-height: 1.5;
      background: rgba(0,0,0,0.35); border-radius: 8px; padding: 10px;
    }

    /* Interactive topic generator */
    .rp-topic-form { display: flex; gap: 8px; margin-bottom: 16px; }
    .rp-topic-input {
      flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.86rem;
      background: rgba(5,10,20,0.6); border: 1px solid rgba(201,168,76,0.22);
      border-radius: 10px; padding: 10px 14px; color: #fdf8ee; outline: none;
    }
    .rp-topic-input:focus { border-color: rgba(201,168,76,0.5); }
    .rp-topic-btn {
      font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500;
      background: rgba(201,168,76,0.16); border: 1px solid rgba(201,168,76,0.4);
      color: #fdf8ee; border-radius: 10px; padding: 0 18px; cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: all 0.2s;
    }
    .rp-topic-btn:hover:not(:disabled) { background: rgba(201,168,76,0.28); }
    .rp-topic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .rp-topic-result {
      background: rgba(5,10,20,0.55); border: 1px solid rgba(201,168,76,0.10);
      border-radius: 12px; padding: 16px 18px; margin-bottom: 12px;
    }
    .rp-topic-result h4 {
      font-family: 'DM Serif Display', Georgia, serif; font-size: 0.98rem;
      color: #c9a84c; margin: 0 0 8px;
    }
    .rp-topic-result p { font-size: 0.85rem; color: rgba(248,235,190,0.82); line-height: 1.7; margin: 0; }
    .rp-spin { animation: rpSpin 1s linear infinite; }
    @keyframes rpSpin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ─── ResultsPanel component ─────────────────────────────────────────────────── */
const ResultsPanel = ({
  results,
  selectedOptions,
  subtitleFormat = 'srt',
  videoFile,
  onDownload,
  showRawSrt,
  setShowRawSrt,
  showSuccessBar = true,
  taskId,
}) => {
  const videoRef = useRef(null);
  const chapters = Array.isArray(results.chapters) ? results.chapters : [];
  const visualChunks = Array.isArray(results.visual_chunks) ? results.visual_chunks : [];

  const seekTo = (sec) => {
    setActiveTab('subtitles');
    // allow the tab + <video> to mount before seeking
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = Number(sec) || 0;
        videoRef.current.play?.().catch(() => {});
      }
    }, 60);
  };

  // Interactive on-demand topic summaries (no re-upload)
  const [topicInput, setTopicInput] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState(null);
  const [topicResults, setTopicResults] = useState(() =>
    results.topic_summary
      ? [{
          topic: results.topic_summary.topic || 'Processed topic',
          summary: results.topic_summary.text || results.topic_summary.summary || '',
          key_points: results.topic_summary.key_points || [],
        }]
      : []
  );

  const generateTopic = async () => {
    const topic = topicInput.trim();
    if (!topic || !taskId) return;
    setTopicLoading(true); setTopicError(null);
    try {
      const res = await apiService.getTopicSummary(taskId, topic);
      const ts = res.topic_summary || {};
      setTopicResults((prev) => [
        { topic, summary: ts.summary || '', key_points: ts.key_points || [] },
        ...prev,
      ]);
      setTopicInput('');
    } catch (e) {
      setTopicError('Could not generate summary. Make sure processing finished.');
    } finally {
      setTopicLoading(false);
    }
  };

  const tabs = [];
  if (selectedOptions.transcript) tabs.push({ id: 'transcript', label: 'Transcript',      icon: FileText });
  if (selectedOptions.subtitles)  tabs.push({ id: 'subtitles',  label: 'Video',           icon: Play });
  if (chapters.length > 0)        tabs.push({ id: 'chapters',   label: 'Chapters',         icon: BarChart2 });
  if (selectedOptions.summary)    tabs.push({ id: 'summary',    label: 'General Summary', icon: Brain });
  // Topic summary tab — always available so users can ask for more without re-uploading
  tabs.push({ id: 'topic', label: 'Topic Summaries', icon: Search });
  if (visualChunks.length > 0)    tabs.push({ id: 'visual',     label: 'On-screen',        icon: Image });
  // Keyframes always extracted but tab shown when data is present
  if (results.keyframes?.length > 0) tabs.push({ id: 'keyframes', label: 'Keyframes', icon: Image });

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'transcript');

  return (
    <div className="rp-wrap">
      <PanelStyles />

      {showSuccessBar && (
        <div className="rp-success-bar">
          <div className="rp-success-icon">
            <CheckCircle size={18} color="#22c55e" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="rp-success-title">Processing complete</div>
            <div className="rp-success-sub">{videoFile?.name || 'Result'} — all outputs are ready</div>
          </div>
          {taskId && (
            <Link
              to={`/logs/${taskId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.76rem', color: '#c9a84c', textDecoration: 'none',
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(201,168,76,0.07)',
                border: '1px solid rgba(201,168,76,0.22)',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              <BarChart2 size={13} /> Pipeline Logs
            </Link>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="rp-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`rp-tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <div className="rp-tab-dot" />
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="rp-panel">

        {/* TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><FileText size={15} color="rgba(201,168,76,0.85)" /></div>
                Full Transcript
              </div>
              <div className="rp-panel-actions">
                <button onClick={() => onDownload('transcript')} className="rp-icon-btn" title="Download transcript">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="rp-panel-body">
              <div className="rp-transcript-body">{results.transcript}</div>
            </div>
          </>
        )}

        {/* SUBTITLES */}
        {activeTab === 'subtitles' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><Play size={15} color="rgba(201,168,76,0.85)" /></div>
                Video with Subtitles
              </div>
              <div className="rp-panel-actions">
                <span className="rp-badge rp-badge-dim">{(subtitleFormat || 'srt').toUpperCase()}</span>
                {results.chaptered_video_url && (
                  <button onClick={() => onDownload('chaptered_video')} className="rp-icon-btn" title="Download chaptered MP4">
                    <Play size={14} />
                  </button>
                )}
                <button onClick={() => onDownload('subtitles')} className="rp-icon-btn" title="Download subtitles">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="rp-panel-body">
              <div className="rp-video-container">
                {results.video_url ? (
                  <video ref={videoRef} controls preload="metadata">
                    <source src={results.video_url} />
                    {results.subtitles_vtt_url && (
                      <track kind="subtitles" label="English" srcLang="en"
                        src={results.subtitles_vtt_url} default />
                    )}
                    {results.chapters_vtt_url && (
                      <track kind="chapters" label="Chapters" srcLang="en"
                        src={results.chapters_vtt_url} />
                    )}
                    Your browser does not support inline video playback.
                  </video>
                ) : (
                  <div className="rp-video-fallback">Video preview not available.</div>
                )}
              </div>

              {chapters.length > 0 && (
                <div className="rp-chapters">
                  {chapters.map((ch) => (
                    <button key={ch.index} className="rp-chapter" onClick={() => seekTo(ch.start_sec)}>
                      <span className="rp-chapter-ts">{fmtTime(ch.start_sec)}</span>
                      <span>
                        <span className="rp-chapter-title">{ch.title || `Chapter ${ch.index + 1}`}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="rp-srt-toggle-row">
                <button type="button" onClick={() => setShowRawSrt(v => !v)} className="rp-srt-toggle-btn">
                  {showRawSrt ? '▾' : '▸'} {showRawSrt ? 'Hide' : 'Show'} raw subtitles
                </button>
              </div>
              {showRawSrt && (
                <div className="rp-srt-raw-box"><pre>{results.subtitles}</pre></div>
              )}
            </div>
          </>
        )}

        {/* SUMMARY */}
        {activeTab === 'summary' && results.summary && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><Brain size={15} color="rgba(201,168,76,0.85)" /></div>
                General Summary
              </div>
              <div className="rp-panel-actions">
                <div className="rp-meta-row">
                  {results.summary.retrieved_chunk_count != null && (
                    <span className="rp-badge rp-badge-dim">{results.summary.retrieved_chunk_count} chunks retrieved</span>
                  )}
                  <span className={`rp-badge ${results.summary.summary_type === 'gemini' ? 'rp-badge-teal' : 'rp-badge-dim'}`}>
                    {results.summary.summary_type === 'gemini' ? 'Gemini' : 'Fallback'}
                  </span>
                  <button onClick={() => onDownload('summary')} className="rp-icon-btn" title="Download summary">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="rp-panel-body">
              <div className="rp-summary-layout">
                <div className="rp-summary-text-block">
                  {results.summary.text || results.summary.summary || ''}
                </div>
                {results.summary.key_points?.length > 0 && (
                  <div className="rp-keypoints-block">
                    <div className="rp-keypoints-label">Key Points</div>
                    {results.summary.key_points.map((point, i) => (
                      <div key={i} className="rp-keypoint-item">
                        <div className="rp-keypoint-bullet">{i + 1}</div>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* KEYFRAMES */}
        {activeTab === 'keyframes' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><Image size={15} color="rgba(201,168,76,0.85)" /></div>
                Keyframes
                {results.keyframes?.length > 0 && (
                  <span className="rp-badge rp-badge-dim" style={{ marginLeft: 8 }}>{results.keyframes.length} frames</span>
                )}
              </div>
              <div className="rp-panel-actions">
                <button onClick={() => onDownload('keyframes')} className="rp-icon-btn" title="Download timestamp list">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="rp-panel-body">
              {!results.keyframes || results.keyframes.length === 0 ? (
                <div className="rp-kf-empty">No keyframes extracted.</div>
              ) : (
                <div className="rp-kf-grid">
                  {results.keyframes.map((kf, i) => {
                    const url = kf.frame_url || null;
                    const ts = typeof kf.timestamp === 'number'
                      ? `${Math.floor(kf.timestamp / 60)}:${String(Math.floor(kf.timestamp % 60)).padStart(2, '0')}`
                      : (kf.timestamp || `${i + 1}`);
                    return url ? (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="rp-kf-cell">
                        <img src={url} alt={`Keyframe at ${ts}`} loading="lazy" />
                        <span className="rp-kf-time">{ts}</span>
                      </a>
                    ) : (
                      <div key={i} className="rp-kf-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="rp-kf-time" style={{ position: 'static' }}>{ts}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* TOPIC SUMMARIES — interactive, generate more without re-uploading */}
        {activeTab === 'topic' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><Search size={15} color="rgba(201,168,76,0.85)" /></div>
                Topic Summaries
              </div>
            </div>
            <div className="rp-panel-body">
              <div className="rp-topic-form">
                <input
                  className="rp-topic-input"
                  placeholder="Ask for a topic-specific summary (e.g. 'the binary search code')"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateTopic()}
                  disabled={topicLoading || !taskId}
                />
                <button
                  className="rp-topic-btn"
                  onClick={generateTopic}
                  disabled={topicLoading || !taskId || !topicInput.trim()}
                >
                  {topicLoading
                    ? <span className="rp-spin" style={{ display: 'inline-block' }}>⟳</span>
                    : <Search size={14} />}
                  {topicLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {topicError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: 12 }}>{topicError}</div>
              )}
              {topicResults.length === 0 && !topicLoading && (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(220,195,130,0.5)', fontSize: '0.86rem', fontStyle: 'italic' }}>
                  No topic summaries yet — type a topic above to generate one from the processed video.
                </div>
              )}
              {topicResults.map((tr, i) => (
                <div key={i} className="rp-topic-result">
                  <h4>{tr.topic}</h4>
                  <p>{tr.summary || 'No content found for this topic.'}</p>
                  {tr.key_points?.length > 0 && (
                    <ul className="rp-chapter-kp">
                      {tr.key_points.map((p, j) => <li key={j}>{p}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CHAPTERS — structured, with seek + per-chapter summary */}
        {activeTab === 'chapters' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><BarChart2 size={15} color="rgba(201,168,76,0.85)" /></div>
                Chapters
                <span className="rp-badge rp-badge-dim" style={{ marginLeft: 8 }}>{chapters.length}</span>
              </div>
              <div className="rp-panel-actions">
                {results.notes_url && (
                  <button onClick={() => onDownload('notes')} className="rp-icon-btn" title="Download notes (.md)">
                    <Download size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="rp-panel-body">
              <div className="rp-chapters">
                {chapters.map((ch) => (
                  <div key={ch.index} className="rp-chapter" style={{ cursor: 'default' }}>
                    <button
                      className="rp-chapter-ts"
                      style={{ cursor: 'pointer' }}
                      onClick={() => seekTo(ch.start_sec)}
                      title="Jump to chapter"
                    >
                      {fmtTime(ch.start_sec)}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div className="rp-chapter-title">{ch.title || `Chapter ${ch.index + 1}`}</div>
                      {ch.summary && <div className="rp-chapter-sum">{ch.summary}</div>}
                      {ch.key_points?.length > 0 && (
                        <ul className="rp-chapter-kp">
                          {ch.key_points.map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ON-SCREEN — OCR'd visual content (code/slides/diagrams) */}
        {activeTab === 'visual' && (
          <>
            <div className="rp-panel-header">
              <div className="rp-panel-title">
                <div className="rp-panel-title-icon"><Image size={15} color="rgba(201,168,76,0.85)" /></div>
                On-screen Content
                <span className="rp-badge rp-badge-dim" style={{ marginLeft: 8 }}>{visualChunks.length}</span>
              </div>
            </div>
            <div className="rp-panel-body">
              {visualChunks.length === 0 ? (
                <div className="rp-kf-empty">No on-screen text detected.</div>
              ) : (
                visualChunks.map((vc, i) => (
                  <div key={i} className="rp-visual-card">
                    <div>
                      {vc.frame_url
                        ? <img src={vc.frame_url} alt={`Frame at ${fmtTime(vc.time_start)}`} loading="lazy" />
                        : <div className="rp-video-fallback" style={{ height: 110 }}>no image</div>}
                      <div className="rp-visual-meta" style={{ marginTop: 8 }}>
                        <button className="rp-chapter-ts" style={{ cursor: 'pointer' }} onClick={() => seekTo(vc.time_start)}>
                          {fmtTime(vc.time_start)}
                        </button>
                        {vc.label && <span className="rp-badge rp-badge-dim">{vc.label}</span>}
                      </div>
                    </div>
                    <div className="rp-visual-text">{vc.text}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default ResultsPanel;
