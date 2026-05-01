import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Mail, Calendar, FileVideo, Download, Clock,
  Search, Eye, Trash2, Settings, LogOut, ChevronRight,
  Brain, FileText, Image, BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Fonts & global styles ─────────────────────────────────────────────────── */
const FontImport = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; cursor: none !important; }

    :root {
      --bg-deep: #03091a;
      --bg-mid: #071020;
      --bg-surface: #0f172a;
      --bg-elevated: #1e3a5f;
      --accent: #facc15;
      --accent-light: #ffe566;
      --white: #ffffff;
      --text-muted: rgba(219,234,254,0.75);
      --text-faint: rgba(219,234,254,0.5);
      --border-subtle: rgba(250,204,21,0.12);
      --border-hover: rgba(250,204,21,0.32);
      --font-display: 'Barlow Condensed', sans-serif;
      --font-body: 'Barlow', sans-serif;
      --font-brand: 'Cinzel Decorative', cursive;
    }

    .pf-wrap {
      font-family: var(--font-body);
      background: var(--bg-deep);
      min-height: 100vh;
      color: var(--white);
      position: relative;
      overflow-x: hidden;
    }

    /* Noise */
    .pf-wrap::before {
      content: '';
      position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 0; opacity: 0.45;
    }

    /* Grid */
    .pf-wrap::after {
      content: '';
      position: fixed; inset: 0;
      background-image:
        repeating-linear-gradient(0deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 20%, transparent 75%);
      mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 20%, transparent 75%);
      pointer-events: none; z-index: 0;
    }

    /* ── Nav ── */
    .pf-nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(3,9,26,0.88);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
    }

    .pf-nav-inner {
      max-width: 1280px; margin: 0 auto; padding: 0 2rem;
      height: 64px; display: flex; align-items: center; justify-content: space-between;
    }

    .nav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .nav-brand-logo { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--accent); }
    .nav-brand-name { font-family: var(--font-brand); font-size: 1.5rem; color: var(--accent); letter-spacing: 0.03em; }

    .nav-links { display: flex; align-items: center; gap: 1.5rem; }

    .nav-link {
      font-family: var(--font-display); font-size: 0.82rem; font-weight: 700;
      letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--text-muted); text-decoration: none; transition: color 0.2s;
      position: relative; padding-bottom: 2px;
    }
    .nav-link::after {
      content: ''; position: absolute; bottom: -2px; left: 0; right: 100%;
      height: 2px; background: var(--accent);
      transition: right 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .nav-link:hover { color: var(--accent); }
    .nav-link:hover::after { right: 0; }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--accent); color: #03091a;
      font-family: var(--font-display); font-size: 0.78rem; font-weight: 800;
      letter-spacing: 0.14em; text-transform: uppercase;
      padding: 0.65rem 1.4rem; border: none;
      clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
      transition: all 0.2s; text-decoration: none;
    }
    .btn-primary:hover { background: var(--accent-light); box-shadow: 0 8px 30px rgba(250,204,21,0.35); transform: translateY(-1px); }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent; color: var(--text-muted);
      font-family: var(--font-display); font-size: 0.78rem; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      padding: 0.65rem 1.4rem; border: 1px solid rgba(255,255,255,0.15);
      clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
      transition: all 0.2s; text-decoration: none;
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

    .btn-danger {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(220,38,38,0.1); color: #fca5a5;
      font-family: var(--font-display); font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      padding: 0.6rem 1.2rem; border: 1px solid rgba(220,38,38,0.25);
      clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
      transition: all 0.2s;
    }
    .btn-danger:hover { background: rgba(220,38,38,0.22); border-color: rgba(220,38,38,0.5); }

    /* ── Page ── */
    .pf-page {
      position: relative; z-index: 1;
      max-width: 1280px; margin: 0 auto; padding: 3.5rem 2rem 6rem;
    }

    /* ── Profile hero ── */
    .profile-hero {
      background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,58,95,0.7) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2.5rem;
      margin-bottom: 1.5rem;
      position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 2rem;
    }

    .profile-hero::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--accent) 0%, rgba(250,204,21,0.3) 100%);
    }

    .profile-hero-glow {
      position: absolute; top: -80px; right: -80px;
      width: 300px; height: 300px; border-radius: 50%;
      background: radial-gradient(circle, rgba(250,204,21,0.07), transparent 70%);
      pointer-events: none;
    }

    .avatar-ring {
      width: 88px; height: 88px; border-radius: 50%;
      background: linear-gradient(135deg, rgba(250,204,21,0.15), rgba(30,58,95,0.8));
      border: 2px solid rgba(250,204,21,0.3);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative;
    }

    .avatar-ring::after {
      content: ''; position: absolute; inset: -4px; border-radius: 50%;
      border: 1px solid rgba(250,204,21,0.12);
    }

    .profile-name {
      font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em;
      line-height: 0.95; color: var(--white); margin-bottom: 0.6rem;
    }

    .profile-meta {
      display: flex; flex-wrap: wrap; gap: 1.25rem;
      font-size: 0.85rem; color: var(--text-faint);
    }

    .profile-meta-item { display: flex; align-items: center; gap: 6px; }

    /* ── Stat cards ── */
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px; margin-bottom: 2rem;
    }

    .stat-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.35));
      border: 1px solid var(--border-subtle); border-radius: 16px;
      padding: 1.4rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative; overflow: hidden;
    }

    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent) 0%, rgba(250,204,21,0.2) 100%);
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .stat-card:hover { border-color: var(--border-hover); transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,0.45); }
    .stat-card:hover::before { transform: scaleX(1); }

    .stat-label {
      font-family: var(--font-display); font-size: 0.66rem; font-weight: 700;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 0.4rem;
    }

    .stat-value {
      font-family: var(--font-display); font-size: 2.2rem; font-weight: 900;
      color: var(--white); letter-spacing: 0.02em; line-height: 1;
    }

    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(250,204,21,0.08); border: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(250,204,21,0.18) 30%, rgba(250,204,21,0.18) 70%, transparent);
      margin: 2rem 0;
    }

    /* ── Tabs ── */
    .tabs-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.3));
      border: 1px solid var(--border-subtle); border-radius: 20px; overflow: hidden;
    }

    .tabs-header {
      display: flex; border-bottom: 1px solid var(--border-subtle);
      padding: 0 1.5rem; gap: 0;
    }

    .tab-btn {
      font-family: var(--font-display); font-size: 0.78rem; font-weight: 700;
      letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--text-faint); background: none; border: none;
      padding: 1.1rem 1.5rem; position: relative; transition: color 0.2s;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }

    .tab-btn::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 100%;
      height: 2px; background: var(--accent);
      transition: right 0.3s cubic-bezier(0.23,1,0.32,1);
    }

    .tab-btn:hover { color: var(--text-muted); }
    .tab-btn.active { color: var(--accent); }
    .tab-btn.active::after { right: 0; }

    .tabs-body { padding: 2rem; }

    /* ── Overview ── */
    .overview-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }

    @media (max-width: 700px) { .overview-grid { grid-template-columns: 1fr; } }

    .info-block {
      background: rgba(3,9,26,0.5); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 1.5rem;
    }

    .info-block-title {
      font-family: var(--font-display); font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.25rem;
    }

    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.65rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .info-row:last-child { border-bottom: none; }

    .info-key { font-size: 0.83rem; color: var(--text-faint); }
    .info-val { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--white); letter-spacing: 0.02em; }

    /* ── History ── */
    .history-controls {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 1.5rem;
    }

    .history-title {
      font-family: var(--font-display); font-size: 1.1rem; font-weight: 900;
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--white);
    }

    .search-wrap {
      position: relative; flex: 1; max-width: 280px;
    }

    .search-icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: var(--text-faint); pointer-events: none;
    }

    .search-input {
      width: 100%; background: rgba(3,9,26,0.7); border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 0.6rem 0.9rem 0.6rem 2.4rem;
      color: var(--white); font-family: var(--font-body); font-size: 0.85rem;
      outline: none; transition: border-color 0.2s;
      caret-color: var(--accent);
    }
    .search-input::placeholder { color: var(--text-faint); }
    .search-input:focus { border-color: rgba(250,204,21,0.3); }

    .filter-select {
      background: rgba(3,9,26,0.7); border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 0.6rem 1rem;
      color: var(--white); font-family: var(--font-display); font-size: 0.75rem;
      font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      outline: none; transition: border-color 0.2s; appearance: none;
    }
    .filter-select:focus { border-color: rgba(250,204,21,0.3); }
    .filter-select option { background: #0f172a; }

    /* History items */
    .history-list { display: flex; flex-direction: column; gap: 10px; }

    .history-item {
      background: rgba(3,9,26,0.5); border: 1px solid var(--border-subtle);
      border-radius: 14px; padding: 1rem 1.25rem;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .history-item:hover {
      border-color: var(--border-hover); background: rgba(15,23,42,0.8);
      transform: translateX(4px);
    }

    .history-left { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }

    .history-thumb {
      width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
      background: rgba(250,204,21,0.08); border: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
    }

    .history-filename {
      font-family: var(--font-display); font-size: 0.9rem; font-weight: 700;
      letter-spacing: 0.02em; color: var(--white);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;
    }

    .history-meta {
      font-size: 0.75rem; color: var(--text-faint); margin-top: 3px;
      display: flex; gap: 8px; align-items: center;
    }

    .history-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .type-badge {
      font-family: var(--font-display); font-size: 0.62rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 100px;
      display: flex; align-items: center; gap: 5px;
    }

    .badge-transcript { background: rgba(59,130,246,0.12); color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
    .badge-summary    { background: rgba(139,92,246,0.12); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.2); }
    .badge-subtitles  { background: rgba(34,197,94,0.1);  color: #86efac; border: 1px solid rgba(34,197,94,0.2); }
    .badge-keyframes  { background: rgba(249,115,22,0.1); color: #fdba74; border: 1px solid rgba(249,115,22,0.2); }
    .badge-full       { background: rgba(250,204,21,0.08); color: var(--accent); border: 1px solid rgba(250,204,21,0.2); }

    .status-chip {
      font-family: var(--font-display); font-size: 0.6rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      padding: 2px 8px; border-radius: 100px;
    }

    .status-completed { background: rgba(34,197,94,0.1); color: #86efac; border: 1px solid rgba(34,197,94,0.2); }
    .status-failed    { background: rgba(239,68,68,0.1);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }
    .status-pending   { background: rgba(250,204,21,0.08); color: var(--accent); border: 1px solid rgba(250,204,21,0.2); }

    .icon-btn {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .icon-btn.view  { color: var(--accent); }
    .icon-btn.dl    { color: rgba(147,197,253,0.8); }
    .icon-btn.del   { color: rgba(252,165,165,0.7); }
    .icon-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.1); }
    .icon-btn.del:hover { background: rgba(220,38,38,0.15); }

    .history-empty {
      text-align: center; padding: 4rem 2rem;
      color: var(--text-faint); font-style: italic; font-size: 0.9rem;
    }

    /* ── Settings ── */
    .settings-section { margin-bottom: 2rem; }

    .settings-section-title {
      font-family: var(--font-display); font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem;
    }

    .settings-block {
      background: rgba(3,9,26,0.5); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 1.5rem;
    }

    .checkbox-row {
      display: flex; align-items: center; gap: 12px;
      padding: 0.7rem 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .checkbox-row:last-child { border-bottom: none; }

    .custom-checkbox {
      width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
      background: rgba(250,204,21,0.06); border: 1px solid rgba(250,204,21,0.2);
      display: flex; align-items: center; justify-content: center;
      accent-color: var(--accent);
    }

    .checkbox-label { font-size: 0.875rem; color: var(--text-muted); }

    .settings-field { margin-bottom: 1rem; }
    .settings-field:last-child { margin-bottom: 0; }

    .field-label {
      font-family: var(--font-display); font-size: 0.68rem; font-weight: 700;
      letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 0.5rem;
    }

    .field-select {
      width: 100%; background: rgba(3,9,26,0.7); border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 0.65rem 1rem;
      color: var(--white); font-family: var(--font-body); font-size: 0.875rem;
      outline: none; transition: border-color 0.2s;
    }
    .field-select:focus { border-color: rgba(250,204,21,0.3); }
    .field-select option { background: #0f172a; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .tab-content { animation: fadeIn 0.3s ease; }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #03091a; }
    ::-webkit-scrollbar-thumb { background: rgba(250,204,21,0.25); border-radius: 3px; }
  `}</style>
);

/* ─── Custom Cursor ──────────────────────────────────────────────────────────── */
const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const trailRefs = useRef([]);
  const TRAIL_COUNT = 8;
  const positions = useRef(Array(TRAIL_COUNT).fill({ x: -200, y: -200 }));
  const mouse = useRef({ x: -200, y: -200 });
  const ring = useRef({ x: -200, y: -200 });
  const rafRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onDown = () => setClicking(true);
    const onUp   = () => setClicking(false);
    const onEnter = (e) => { if (e.target.closest('a, button, [role="button"], label, select')) setHovering(true); };
    const onLeave = (e) => { if (e.target.closest('a, button, [role="button"], label, select')) setHovering(false); };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onEnter);
    document.addEventListener('mouseout', onLeave);

    const animate = () => {
      if (dotRef.current) dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`;
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        const s = hovering ? 2.2 : clicking ? 0.7 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px) scale(${s})`;
        ringRef.current.style.opacity = hovering ? '0.6' : '0.35';
        ringRef.current.style.borderColor = hovering ? '#facc15' : 'rgba(250,204,21,0.7)';
        ringRef.current.style.background = hovering ? 'rgba(250,204,21,0.06)' : 'transparent';
      }
      positions.current = [{ x: mouse.current.x, y: mouse.current.y }, ...positions.current.slice(0, TRAIL_COUNT - 1)];
      trailRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = positions.current[i];
        el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px) scale(${1 - i / TRAIL_COUNT})`;
        el.style.opacity = String((1 - i / TRAIL_COUNT) * 0.55);
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onEnter);
      document.removeEventListener('mouseout', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div key={i} ref={el => trailRefs.current[i] = el} style={{
          position: 'fixed', top: 0, left: 0, zIndex: 99998,
          width: '6px', height: '6px', borderRadius: '50%',
          background: `hsl(${46 - i * 3}, ${95 - i * 4}%, ${60 - i * 3}%)`,
          pointerEvents: 'none', willChange: 'transform, opacity',
        }} />
      ))}
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        width: '8px', height: '8px', borderRadius: '50%',
        background: '#facc15', pointerEvents: 'none',
        boxShadow: '0 0 6px rgba(250,204,21,0.8)', willChange: 'transform',
      }} />
      <div ref={ringRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99997,
        width: '40px', height: '40px', borderRadius: '50%',
        border: '1.5px solid rgba(250,204,21,0.7)',
        pointerEvents: 'none', willChange: 'transform, opacity',
        transition: 'border-color 0.3s ease, background 0.3s ease',
      }} />
    </>
  );
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const TYPE_BADGE = {
  transcript: { cls: 'badge-transcript', label: 'Transcript' },
  summary:    { cls: 'badge-summary',    label: 'Summary' },
  subtitles:  { cls: 'badge-subtitles',  label: 'Subtitles' },
  keyframes:  { cls: 'badge-keyframes',  label: 'Keyframes' },
  full:       { cls: 'badge-full',       label: 'Full' },
};

const TYPE_ICON = {
  transcript: <FileText size={11} />,
  summary:    <Brain size={11} />,
  subtitles:  <Clock size={11} />,
  keyframes:  <Image size={11} />,
  full:       <FileVideo size={11} />,
};

const STATUS_CLS = {
  completed: 'status-completed',
  failed:    'status-failed',
  error:     'status-failed',
  pending:   'status-pending',
  processing:'status-pending',
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
      <CustomCursor />
      <FontImport />

      {/* Nav */}
      <nav className="pf-nav">
        <div className="pf-nav-inner">
          <Link to="/landing" className="nav-brand">
            <img src="/logo.png" alt="Mimir" className="nav-brand-logo" />
            <span className="nav-brand-name">Mimir</span>
          </Link>
          <div className="nav-links">
            <Link to="/upload" className="btn-primary" style={{ padding: '0.55rem 1.2rem', fontSize: '0.75rem' }}>Upload</Link>
            <Link to="/landing" className="nav-link">Home</Link>
            <button onClick={logout} className="btn-danger">
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="pf-page">

        {/* ── Profile Hero ── */}
        <div className="profile-hero">
          <div className="profile-hero-glow" />
          <div className="avatar-ring">
            <User size={36} color="rgba(250,204,21,0.7)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>Profile</p>
            <h1 className="profile-name">{userData.name}</h1>
            <div className="profile-meta">
              <span className="profile-meta-item">
                <Mail size={13} color="rgba(219,234,254,0.4)" />
                {userData.email}
              </span>
              <span className="profile-meta-item">
                <Calendar size={13} color="rgba(219,234,254,0.4)" />
                Member since {userData.joinDate}
              </span>
            </div>
          </div>
          <button className="btn-ghost" style={{ flexShrink: 0 }}>
            <Settings size={14} />
            Edit Profile
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
                <Icon size={18} color="#facc15" />
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* ── Tabs ── */}
        <div className="tabs-card">
          <div className="tabs-header">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="tabs-body">

            {/* Overview */}
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

            {/* History */}
            {activeTab === 'history' && (
              <div className="tab-content">
                <div className="history-controls">
                  <h2 className="history-title">Processing History</h2>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-wrap">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
                      <option value="all">All Types</option>
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
                    <div className="history-empty">No videos processed yet — upload your first video to get started.</div>
                  ) : (
                    filteredGenerations.map(gen => {
                      const badge = TYPE_BADGE[gen.type] || TYPE_BADGE.full;
                      const statusCls = STATUS_CLS[gen.status] || 'status-pending';
                      return (
                        <div key={gen.id} className="history-item">
                          <div className="history-left">
                            <div className="history-thumb">📹</div>
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
                            <button className="icon-btn view"><Eye size={14} /></button>
                            <button className="icon-btn dl"><Download size={14} /></button>
                            <button className="icon-btn del"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Settings */}
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
                      <label key={label} className="checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="checkbox" defaultChecked={defaultChecked} style={{ accentColor: '#facc15', width: 16, height: 16 }} />
                        <span className="checkbox-label">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <p className="settings-section-title">Processing Preferences</p>
                  <div className="settings-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                  <button className="btn-primary">Save Changes</button>
                  <button className="btn-ghost">Reset to Default</button>
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