import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Mail, Calendar, FileVideo, Download, Clock,
  Search, Eye, Trash2, Settings, LogOut, ChevronRight,
  Brain, FileText, Image, BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --bg:           #0a1a1a;
      --bg-mid:       #0d2020;
      --bg-light:     #112828;
      --glass-bg:     rgba(20, 55, 52, 0.45);
      --glass-border: rgba(100, 210, 190, 0.18);
      --glass-shine:  rgba(160, 240, 220, 0.07);
      --teal:         #64d2c8;
      --teal-dim:     rgba(100, 210, 200, 0.55);
      --teal-faint:   rgba(100, 210, 200, 0.18);
      --white:        #f0faf8;
      --text:         rgba(220, 248, 242, 0.82);
      --text-dim:     rgba(180, 230, 220, 0.5);
      --font-serif:   'DM Serif Display', Georgia, serif;
      --font-sans:    'DM Sans', sans-serif;
      --font-brand:   'Cinzel Decorative', cursive;
      --radius-lg:    20px;
      --radius-xl:    28px;
    }

    .pf-wrap {
      font-family: var(--font-sans);
      background: var(--bg);
      min-height: 100vh;
      color: var(--white);
      position: relative;
      overflow-x: hidden;
    }

    /* Mesh */
    .pf-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(100,210,200,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,210,200,0.022) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(ellipse 80% 55% at 50% 25%, black 10%, transparent 80%);
    }

    /* Orbs */
    .pf-orb {
      position: fixed; border-radius: 50%; pointer-events: none;
      filter: blur(80px); z-index: 0;
    }
    .pf-orb-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(100,210,200,0.07) 0%, transparent 70%);
      top: -120px; right: 0;
      animation: orbDrift 14s ease-in-out infinite;
    }
    .pf-orb-2 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(80,160,150,0.06) 0%, transparent 70%);
      bottom: 10%; left: -60px;
      animation: orbDrift 18s ease-in-out infinite reverse;
    }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(14px,-20px) scale(1.03); }
      66% { transform: translate(-10px,10px) scale(0.97); }
    }

    /* ── Nav ── */
    .pf-nav {
      position: sticky; top: 0; z-index: 100;
      height: 66px; display: flex; align-items: center;
      padding: 0 clamp(20px, 5vw, 72px);
      justify-content: space-between;
      background: rgba(10, 26, 26, 0.72);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border-bottom: 1px solid var(--glass-border);
    }

    .pf-nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .pf-nav-brand img { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(100,210,200,0.3); }
    .pf-nav-brand-name { font-family: var(--font-brand); font-size: 1.2rem; color: var(--teal); letter-spacing: 0.02em; }

    .pf-nav-links { display: flex; align-items: center; gap: 1.5rem; }
    .pf-nav-a {
      font-size: 0.82rem; font-weight: 500; letter-spacing: 0.04em;
      color: var(--text); text-decoration: none; transition: color 0.25s;
    }
    .pf-nav-a:hover { color: var(--teal); }

    /* Buttons */
    .btn-teal {
      font-family: var(--font-sans); font-size: 0.82rem; font-weight: 500;
      padding: 9px 22px; border-radius: 100px;
      background: linear-gradient(135deg, rgba(100,210,200,0.9) 0%, rgba(80,190,175,0.9) 100%);
      border: 1px solid rgba(160,240,220,0.3);
      color: #061414; cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 7px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(100,210,200,0.18);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-teal:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 28px rgba(100,210,200,0.28); }

    .btn-glass {
      font-family: var(--font-sans); font-size: 0.82rem; font-weight: 500;
      padding: 9px 22px; border-radius: 100px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--white); cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 7px;
      backdrop-filter: blur(16px);
      box-shadow: inset 0 1px 0 var(--glass-shine);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-glass:hover { border-color: rgba(100,210,200,0.38); transform: translateY(-1px); }

    .btn-danger-sm {
      font-family: var(--font-sans); font-size: 0.8rem; font-weight: 500;
      padding: 7px 16px; border-radius: 100px;
      background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25);
      color: #fca5a5; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    .btn-danger-sm:hover { background: rgba(220,38,38,0.2); border-color: rgba(220,38,38,0.5); }

    /* ── Page ── */
    .pf-page {
      position: relative; z-index: 1;
      max-width: 1160px; margin: 0 auto;
      padding: clamp(40px, 6vw, 80px) clamp(20px, 5vw, 48px) 80px;
    }

    /* ── Profile hero ── */
    .profile-hero {
      background: var(--glass-bg);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: 32px 36px;
      margin-bottom: 16px;
      position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 28px;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 20px 56px rgba(0,0,0,0.38);
      animation: riseIn 0.7s cubic-bezier(0.23,1,0.32,1) 0.1s both;
    }
    .profile-hero::before {
      content: '';
      position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.28), transparent);
      pointer-events: none;
    }
    .profile-hero-glow {
      position: absolute; top: -80px; right: -60px;
      width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, rgba(100,210,200,0.07), transparent 70%);
      pointer-events: none; filter: blur(30px);
    }

    @keyframes riseIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .avatar-ring {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(100,210,200,0.09);
      border: 1.5px solid rgba(100,210,200,0.3);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative;
    }
    .avatar-ring::after {
      content: ''; position: absolute; inset: -5px; border-radius: 50%;
      border: 1px solid rgba(100,210,200,0.1);
    }

    .profile-eyebrow {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 6px;
    }
    .profile-name {
      font-family: var(--font-serif); font-size: clamp(1.8rem, 3.5vw, 2.6rem);
      font-weight: 400; color: var(--white); line-height: 1.05;
      margin-bottom: 12px; letter-spacing: -0.01em;
    }
    .profile-meta {
      display: flex; flex-wrap: wrap; gap: 18px;
      font-size: 0.82rem; color: var(--text-dim); font-weight: 300;
    }
    .profile-meta-item { display: flex; align-items: center; gap: 6px; }

    /* ── Stats grid ── */
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 12px; margin-bottom: 24px;
      animation: riseIn 0.7s cubic-bezier(0.23,1,0.32,1) 0.2s both;
    }

    .stat-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 20px 22px;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative; overflow: hidden;
    }
    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(100,210,200,0.25), transparent);
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .stat-card:hover { border-color: rgba(100,210,200,0.3); transform: translateY(-3px); box-shadow: 0 18px 48px rgba(0,0,0,0.4); }
    .stat-card:hover::before { transform: scaleX(1); }

    .stat-label {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--text-dim); margin-bottom: 6px;
    }
    .stat-value {
      font-family: var(--font-serif); font-size: 2rem; font-style: italic;
      color: var(--white); line-height: 1;
    }
    .stat-icon {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      background: rgba(100,210,200,0.08); border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
    }

    /* Divider */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(100,210,200,0.14) 30%, rgba(100,210,200,0.14) 70%, transparent);
      margin: 20px 0;
    }

    /* ── Tabs card ── */
    .tabs-card {
      background: var(--glass-bg);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 20px 56px rgba(0,0,0,0.35);
      animation: riseIn 0.7s cubic-bezier(0.23,1,0.32,1) 0.3s both;
    }

    .tabs-header {
      display: flex; border-bottom: 1px solid var(--glass-border);
      padding: 0 28px; gap: 0;
    }

    .tab-btn {
      font-family: var(--font-sans); font-size: 0.8rem; font-weight: 500;
      letter-spacing: 0.04em; color: var(--text-dim);
      background: none; border: none; cursor: pointer;
      padding: 18px 20px; position: relative; transition: color 0.2s;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tab-btn::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 100%;
      height: 2px; background: var(--teal);
      transition: right 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--teal); }
    .tab-btn.active::after { right: 0; }

    .tabs-body { padding: 28px 32px; }

    /* ── Overview ── */
    .overview-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    @media (max-width: 680px) { .overview-grid { grid-template-columns: 1fr; } }

    .info-block {
      background: rgba(5, 18, 18, 0.5);
      border: 1px solid var(--glass-border);
      border-radius: 14px; padding: 20px 22px;
    }
    .info-block-title {
      font-size: 0.63rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 16px;
    }
    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid rgba(100,210,200,0.06);
    }
    .info-row:last-child { border-bottom: none; }
    .info-key { font-size: 0.82rem; color: var(--text-dim); font-weight: 300; }
    .info-val { font-size: 0.88rem; font-weight: 500; color: var(--white); }

    /* ── History ── */
    .history-controls {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
      gap: 14px; margin-bottom: 20px;
    }

    .history-title {
      font-family: var(--font-serif); font-size: 1.25rem; color: var(--white);
    }

    .search-wrap { position: relative; flex: 1; max-width: 260px; }
    .search-icon-pos {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: var(--text-dim); pointer-events: none;
    }
    .search-input {
      width: 100%;
      background: rgba(5, 18, 18, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 100px;
      padding: 8px 14px 8px 36px;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.83rem; outline: none;
      transition: border-color 0.2s;
      caret-color: var(--teal);
    }
    .search-input::placeholder { color: var(--text-dim); }
    .search-input:focus { border-color: rgba(100,210,200,0.35); }

    .filter-select {
      background: rgba(5, 18, 18, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 100px;
      padding: 8px 16px;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.82rem; outline: none;
      transition: border-color 0.2s; appearance: none; cursor: pointer;
    }
    .filter-select:focus { border-color: rgba(100,210,200,0.35); }
    .filter-select option { background: #0d2020; }

    .history-list { display: flex; flex-direction: column; gap: 8px; }

    .history-item {
      background: rgba(5, 18, 18, 0.45);
      border: 1px solid var(--glass-border);
      border-radius: 14px; padding: 13px 16px;
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .history-item:hover {
      border-color: rgba(100,210,200,0.3);
      background: rgba(10, 30, 28, 0.6);
      transform: translateX(4px);
    }

    .history-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }

    .history-thumb {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      background: rgba(100,210,200,0.08); border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
    }

    .history-filename {
      font-size: 0.88rem; font-weight: 500; color: var(--white);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;
    }
    .history-meta {
      font-size: 0.73rem; color: var(--text-dim); margin-top: 3px;
      display: flex; gap: 7px; align-items: center; font-weight: 300;
    }

    .history-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    /* Badges */
    .type-badge {
      font-size: 0.6rem; font-weight: 500; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
      display: flex; align-items: center; gap: 5px;
    }
    .badge-transcript { background: rgba(100,210,200,0.08); color: var(--teal); border: 1px solid rgba(100,210,200,0.2); }
    .badge-summary    { background: rgba(180,210,200,0.08); color: rgba(180,230,220,0.8); border: 1px solid rgba(180,230,220,0.18); }
    .badge-subtitles  { background: rgba(34,197,94,0.08); color: #86efac; border: 1px solid rgba(34,197,94,0.18); }
    .badge-keyframes  { background: rgba(201,168,76,0.08); color: #c9a84c; border: 1px solid rgba(201,168,76,0.18); }
    .badge-full       { background: rgba(100,210,200,0.06); color: var(--teal-dim); border: 1px solid var(--glass-border); }

    .status-chip {
      font-size: 0.58rem; font-weight: 500; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 2px 9px; border-radius: 100px;
    }
    .status-completed { background: rgba(34,197,94,0.08); color: #86efac; border: 1px solid rgba(34,197,94,0.18); }
    .status-failed    { background: rgba(239,68,68,0.08);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.18); }
    .status-pending   { background: rgba(100,210,200,0.07); color: var(--teal-dim); border: 1px solid var(--glass-border); }

    .icon-btn {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      background: rgba(100,210,200,0.05);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .icon-btn.view  { color: var(--teal-dim); }
    .icon-btn.dl    { color: rgba(180,230,220,0.6); }
    .icon-btn.del   { color: rgba(252,165,165,0.6); }
    .icon-btn:hover { background: rgba(100,210,200,0.1); border-color: rgba(100,210,200,0.3); transform: scale(1.08); }
    .icon-btn.del:hover { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.3); color: #fca5a5; }

    .history-empty {
      text-align: center; padding: 48px 24px;
      color: var(--text-dim); font-style: italic; font-size: 0.88rem; font-weight: 300;
    }

    /* ── Settings ── */
    .settings-section { margin-bottom: 24px; }
    .settings-section-title {
      font-size: 0.63rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 12px;
    }
    .settings-block {
      background: rgba(5, 18, 18, 0.5);
      border: 1px solid var(--glass-border);
      border-radius: 14px; padding: 18px 22px;
    }

    .checkbox-row {
      display: flex; align-items: center; gap: 12px; cursor: pointer;
      padding: 9px 0; border-bottom: 1px solid rgba(100,210,200,0.06);
    }
    .checkbox-row:last-child { border-bottom: none; }

    .checkbox-row input[type="checkbox"] {
      width: 16px; height: 16px; accent-color: var(--teal); cursor: pointer;
    }
    .checkbox-label { font-size: 0.85rem; color: var(--text); font-weight: 300; }

    .settings-field { margin-bottom: 0; }
    .field-label {
      font-size: 0.63rem; font-weight: 500; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px;
    }
    .field-select {
      width: 100%;
      background: rgba(5, 18, 18, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 10px; padding: 9px 14px;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.85rem; outline: none;
      transition: border-color 0.2s; appearance: none; cursor: pointer;
    }
    .field-select:focus { border-color: rgba(100,210,200,0.35); }
    .field-select option { background: #0d2020; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .tab-content { animation: fadeIn 0.3s ease; }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: rgba(100,210,200,0.22); border-radius: 3px; }
  `}</style>
);

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const TYPE_BADGE = {
  transcript: { cls: 'badge-transcript', label: 'Transcript' },
  summary:    { cls: 'badge-summary',    label: 'Summary' },
  subtitles:  { cls: 'badge-subtitles',  label: 'Subtitles' },
  keyframes:  { cls: 'badge-keyframes',  label: 'Keyframes' },
  full:       { cls: 'badge-full',       label: 'Full' },
};

const TYPE_ICON = {
  transcript: <FileText size={10} />,
  summary:    <Brain size={10} />,
  subtitles:  <Clock size={10} />,
  keyframes:  <Image size={10} />,
  full:       <FileVideo size={10} />,
};

const STATUS_CLS = {
  completed:  'status-completed',
  failed:     'status-failed',
  error:      'status-failed',
  pending:    'status-pending',
  processing: 'status-pending',
};

/* ─── Main ───────────────────────────────────────────────────────────────────── */
const Profile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [tasks, setTasks] = useState([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/v1/tasks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  const userData = {
    name: user?.username || 'User',
    email: user?.email || 'user@example.com',
    joinDate: user?.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Recently',
    totalVideos: tasks.filter(t => t.status === 'completed').length,
    totalMinutes: 0,
    storageUsed: '0 MB',
  };

  const pastGenerations = tasks.map(t => ({
    id: t.task_id,
    filename: (t.video_path || t.task_id).split('/').pop(),
    date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    duration: '-',
    size: '-',
    type: t.results?.transcript ? 'transcript' : t.results?.summary ? 'summary' : t.results?.subtitles ? 'subtitles' : t.results?.keyframes ? 'keyframes' : 'full',
    status: t.status,
  }));

  const filteredGenerations = pastGenerations.filter(gen => {
    const matchesSearch = gen.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || gen.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const quickStats = [
    { label: 'Videos Processed', value: String(userData.totalVideos), icon: FileVideo },
    { label: 'Total Tasks',      value: String(tasks.length),         icon: Clock },
    { label: 'Storage Used',     value: userData.storageUsed,         icon: BarChart3 },
    { label: 'Minutes Analysed', value: String(userData.totalMinutes),icon: Brain },
  ];

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history',  label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="pf-wrap">
      <PageStyles />

      {/* Background */}
      <div className="pf-mesh" />
      <div className="pf-orb pf-orb-1" />
      <div className="pf-orb pf-orb-2" />

      {/* ── Nav ── */}
      <nav className="pf-nav">
        <Link to="/landing" className="pf-nav-brand">
          <img src="/logo.png" alt="Mimir" />
          <span className="pf-nav-brand-name">Mimir</span>
        </Link>
        <div className="pf-nav-links">
          <Link to="/upload" className="btn-teal" style={{ padding: '7px 18px', fontSize: '0.8rem' }}>
            Upload
          </Link>
          <Link to="/landing" className="pf-nav-a">Home</Link>
          <button onClick={logout} className="btn-danger-sm">
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </nav>

      <div className="pf-page">

        {/* ── Profile Hero ── */}
        <div className="profile-hero">
          <div className="profile-hero-glow" />
          <div className="avatar-ring">
            <User size={32} color="rgba(100,210,200,0.7)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="profile-eyebrow">Your profile</p>
            <h1 className="profile-name">{userData.name}</h1>
            <div className="profile-meta">
              <span className="profile-meta-item">
                <Mail size={13} color="rgba(180,230,220,0.4)" />
                {userData.email}
              </span>
              <span className="profile-meta-item">
                <Calendar size={13} color="rgba(180,230,220,0.4)" />
                Member since {userData.joinDate}
              </span>
            </div>
          </div>
          <button className="btn-glass" style={{ flexShrink: 0 }}>
            <Settings size={13} />
            Edit profile
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="stats-grid">
          {quickStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card">
              <div>
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
              </div>
              <div className="stat-icon">
                <Icon size={17} color="rgba(100,210,200,0.75)" />
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* ── Tabs ── */}
        <div className="tabs-card">
          <div className="tabs-header">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tabs-body">

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="tab-content overview-grid">
                <div className="info-block">
                  <p className="info-block-title">Account Information</p>
                  <div className="info-row"><span className="info-key">Email</span><span className="info-val">{userData.email}</span></div>
                  <div className="info-row"><span className="info-key">Username</span><span className="info-val">{userData.name}</span></div>
                  <div className="info-row"><span className="info-key">Member Since</span><span className="info-val">{userData.joinDate}</span></div>
                </div>
                <div className="info-block">
                  <p className="info-block-title">Usage Statistics</p>
                  <div className="info-row"><span className="info-key">Videos Processed</span><span className="info-val">{userData.totalVideos}</span></div>
                  <div className="info-row"><span className="info-key">Minutes Analysed</span><span className="info-val">{userData.totalMinutes}</span></div>
                  <div className="info-row"><span className="info-key">Storage Used</span><span className="info-val">{userData.storageUsed}</span></div>
                  <div className="info-row"><span className="info-key">Total Tasks</span><span className="info-val">{tasks.length}</span></div>
                </div>
              </div>
            )}

            {/* ── History ── */}
            {activeTab === 'history' && (
              <div className="tab-content">
                <div className="history-controls">
                  <h2 className="history-title">Processing <em style={{ color: 'var(--teal)' }}>history</em></h2>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-wrap">
                      <Search size={13} className="search-icon-pos" />
                      <input
                        type="text"
                        placeholder="Search files…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All types</option>
                      <option value="transcript">Transcript</option>
                      <option value="summary">Summary</option>
                      <option value="subtitles">Subtitles</option>
                      <option value="keyframes">Keyframes</option>
                      <option value="full">Full</option>
                    </select>
                  </div>
                </div>

                <div className="history-list">
                  {filteredGenerations.length === 0 ? (
                    <div className="history-empty">
                      No videos processed yet — upload your first video to get started.
                    </div>
                  ) : (
                    filteredGenerations.map(gen => {
                      const badge = TYPE_BADGE[gen.type] || TYPE_BADGE.full;
                      const statusCls = STATUS_CLS[gen.status] || 'status-pending';
                      return (
                        <div key={gen.id} className="history-item">
                          <div className="history-left">
                            <div className="history-thumb">
                              <FileVideo size={16} color="rgba(100,210,200,0.6)" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="history-filename">{gen.filename}</div>
                              <div className="history-meta">
                                <span>{gen.date}</span>
                                {gen.duration !== '-' && <><span>·</span><span>{gen.duration}</span></>}
                                {gen.size !== '-' && <><span>·</span><span>{gen.size}</span></>}
                              </div>
                            </div>
                          </div>
                          <div className="history-right">
                            <span className={`type-badge ${badge.cls}`}>
                              {TYPE_ICON[gen.type]}
                              {badge.label}
                            </span>
                            <span className={`status-chip ${statusCls}`}>{gen.status}</span>
                            <button className="icon-btn view" title="View"><Eye size={13} /></button>
                            <button className="icon-btn dl" title="Download"><Download size={13} /></button>
                            <button className="icon-btn del" title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Settings ── */}
            {activeTab === 'settings' && (
              <div className="tab-content">
                <div className="settings-section">
                  <p className="settings-section-title">Notification Preferences</p>
                  <div className="settings-block">
                    {[
                      { label: 'Email notifications for processing completion', defaultChecked: true },
                      { label: 'Weekly usage reports', defaultChecked: true },
                      { label: 'Product updates and new features', defaultChecked: false },
                    ].map(({ label, defaultChecked }) => (
                      <label key={label} className="checkbox-row">
                        <input type="checkbox" defaultChecked={defaultChecked} />
                        <span className="checkbox-label">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <p className="settings-section-title">Processing Preferences</p>
                  <div className="settings-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="settings-field">
                      <p className="field-label">Default Language</p>
                      <select className="field-select">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                    <div className="settings-field">
                      <p className="field-label">Default Output Format</p>
                      <select className="field-select">
                        <option>SRT</option>
                        <option>VTT</option>
                        <option>TXT</option>
                        <option>PDF</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-teal">Save changes</button>
                  <button className="btn-glass">Reset to default</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;