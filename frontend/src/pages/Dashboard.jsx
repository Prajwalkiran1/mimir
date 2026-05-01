import React, { useState, useEffect, useRef  } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Upload, FileVideo, Clock, FileText, Download,
  ChevronRight, Activity, Zap, Target, Languages, Play,
  AlertCircle, CheckCircle, Loader
} from 'lucide-react';

/* ─── Fonts & global styles ──────────────────────────────────────────────────── */
const FontImport = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    *, *::before, *::after { cursor: none !important; }
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

    .db-wrap {
      font-family: var(--font-body);
      background: var(--bg-deep);
      min-height: 100vh;
      color: var(--white);
      position: relative;
      overflow-x: hidden;
    }

    /* Noise */
    .db-wrap::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.45;
    }

    /* Grid */
    .db-wrap::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        repeating-linear-gradient(0deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px);
      -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 75%);
      mask-image: radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 75%);
      pointer-events: none;
      z-index: 0;
    }

    /* ── Nav ── */
    .db-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(3,9,26,0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
    }

    .db-nav-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 2rem;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .nav-brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid var(--accent);
    }

    .nav-brand-name {
      font-family: var(--font-brand);
      font-size: 1.5rem;
      color: var(--accent);
      letter-spacing: 0.03em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-link {
      font-family: var(--font-display);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }

    .nav-link:hover { color: var(--accent); }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--accent);
      color: #03091a;
      font-family: var(--font-display);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 0.65rem 1.4rem;
      border: none;
      cursor: pointer;
      clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: var(--accent-light);
      box-shadow: 0 8px 30px rgba(250,204,21,0.35);
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--white);
      font-family: var(--font-display);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 0.65rem 1.4rem;
      border: 1px solid rgba(255,255,255,0.18);
      cursor: pointer;
      clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

    /* ── Page ── */
    .db-page {
      position: relative;
      z-index: 1;
      max-width: 1280px;
      margin: 0 auto;
      padding: 3.5rem 2rem 6rem;
    }

    /* ── Welcome ── */
    .welcome-row {
      margin-bottom: 3rem;
    }

    .welcome-eyebrow {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .welcome-title {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 0.95;
      color: var(--white);
      margin-bottom: 0.6rem;
    }

    .welcome-title span { color: var(--accent); }

    .welcome-sub {
      font-size: 1rem;
      color: var(--text-muted);
    }

    /* Divider */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(250,204,21,0.18) 30%, rgba(250,204,21,0.18) 70%, transparent);
      margin: 2.5rem 0;
    }

    /* ── Stat cards ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.35));
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 1.4rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--accent) 0%, rgba(250,204,21,0.2) 100%);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .stat-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-3px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }

    .stat-card:hover::before { transform: scaleX(1); }

    .stat-label {
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin-bottom: 0.4rem;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--white);
      letter-spacing: 0.02em;
      line-height: 1;
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(250,204,21,0.08);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ── Main 2-col ── */
    .main-cols {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
      margin-bottom: 2.5rem;
    }

    @media (max-width: 900px) {
      .main-cols { grid-template-columns: 1fr; }
    }

    /* Hero CTA card */
    .hero-card {
      background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,58,95,0.7) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2.5rem;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 260px;
    }

    .hero-card-glow {
      position: absolute;
      top: -60px; right: -60px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(250,204,21,0.07), transparent 70%);
      pointer-events: none;
    }

    .hero-card-glow2 {
      position: absolute;
      bottom: -80px; left: -40px;
      width: 240px;
      height: 240px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%);
      pointer-events: none;
    }

    .hero-eyebrow {
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.75rem;
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1;
      color: var(--white);
      margin-bottom: 0.75rem;
    }

    .hero-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.65;
      margin-bottom: 1.75rem;
      max-width: 480px;
    }

    /* Activity card */
    .activity-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.35));
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
    }

    .card-section-label {
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.25rem;
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--white);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      flex: 1;
    }

    .activity-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }

    .activity-item:last-child { border-bottom: none; }

    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 10px;
    }

    .dot-completed { background: #22c55e; }
    .dot-processing { background: var(--accent); }
    .dot-failed { background: #ef4444; }
    .dot-default { background: var(--text-faint); }

    .activity-name {
      font-size: 0.85rem;
      color: var(--white);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    .activity-status {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin-top: 1px;
    }

    .activity-time {
      font-family: 'Fira Mono', monospace;
      font-size: 0.7rem;
      color: var(--text-faint);
      flex-shrink: 0;
    }

    .activity-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      color: var(--text-faint);
      font-style: italic;
    }

    .view-all-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      text-decoration: none;
      margin-top: 1rem;
      transition: gap 0.2s;
    }

    .view-all-link:hover { gap: 8px; }

    /* ── Features ── */
    .features-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.3));
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2.5rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }

    .feature-item {
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.25rem;
      background: rgba(3,9,26,0.4);
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative;
      overflow: hidden;
    }

    .feature-item::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(250,204,21,0.04), rgba(59,130,246,0.04));
      opacity: 0;
      transition: opacity 0.3s;
    }

    .feature-item:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }

    .feature-item:hover::after { opacity: 1; }

    .feature-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(250,204,21,0.08);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .feature-name {
      font-family: var(--font-display);
      font-size: 0.9rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--white);
      margin-bottom: 0.35rem;
    }

    .feature-desc {
      font-size: 0.78rem;
      color: var(--text-faint);
      line-height: 1.55;
    }

    /* ── Bottom row ── */
    .bottom-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 700px) {
      .bottom-cols { grid-template-columns: 1fr; }
    }

    /* Quick actions */
    .actions-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.35));
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 1.75rem;
    }

    .quick-action-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1rem;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .quick-action-link:hover {
      background: rgba(250,204,21,0.04);
      border-color: var(--border-subtle);
    }

    .quick-action-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .qa-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: rgba(250,204,21,0.07);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .quick-action-link:hover .qa-icon {
      background: rgba(250,204,21,0.12);
      border-color: rgba(250,204,21,0.25);
    }

    .qa-label {
      font-family: var(--font-display);
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--white);
    }

    /* Upgrade card */
    .upgrade-card {
      background: linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(30,58,95,0.5) 100%);
      border: 1px solid rgba(250,204,21,0.22);
      border-radius: 20px;
      padding: 1.75rem;
      position: relative;
      overflow: hidden;
    }

    .upgrade-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--accent), rgba(250,204,21,0.3));
    }

    .upgrade-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .upgrade-desc {
      font-size: 0.88rem;
      color: var(--text-muted);
      line-height: 1.65;
      margin-bottom: 1.5rem;
    }

    .upgrade-perks {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 1.5rem;
    }

    .upgrade-perk {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .perk-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }
  `}</style>
);
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
    const onEnter = (e) => { if (e.target.closest('a, button, [role="button"], label')) setHovering(true); };
    const onLeave = (e) => { if (e.target.closest('a, button, [role="button"], label')) setHovering(false); };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onEnter);
    document.addEventListener('mouseout', onLeave);

    const animate = () => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`;
      }
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        const s = hovering ? 2.2 : clicking ? 0.7 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px) scale(${s})`;
        ringRef.current.style.opacity = hovering ? '0.6' : '0.35';
        ringRef.current.style.borderColor = hovering ? '#facc15' : 'rgba(250,204,21,0.7)';
        ringRef.current.style.background = hovering ? 'rgba(250,204,21,0.06)' : 'transparent';
      }
      positions.current = [
        { x: mouse.current.x, y: mouse.current.y },
        ...positions.current.slice(0, TRAIL_COUNT - 1),
      ];
      trailRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = positions.current[i];
        const scale = 1 - i / TRAIL_COUNT;
        el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px) scale(${scale})`;
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
/* ── Status helpers ─────────────────────────────────────────────────────────── */
const statusDotClass = (status) => {
  if (status === 'completed') return 'activity-dot dot-completed';
  if (status === 'processing' || status === 'pending') return 'activity-dot dot-processing';
  if (status === 'failed' || status === 'error') return 'activity-dot dot-failed';
  return 'activity-dot dot-default';
};

const FEATURES = [
  { icon: Brain, label: 'AI Transcription', desc: '99.5% accuracy with speaker ID' },
  { icon: Clock, label: 'Synced Subtitles', desc: 'Perfectly timed in multiple formats' },
  { icon: FileText, label: 'Smart Summaries', desc: 'RAG-based with keyframes' },
  { icon: Languages, label: 'Multi-Language', desc: 'Support for 50+ languages' },
  { icon: Download, label: 'Multiple Formats', desc: 'SRT · VTT · TXT · PDF' },
  { icon: Zap, label: 'Fast Processing', desc: 'Real-time pipeline updates' },
];

/* ─── Main ─────────────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/v1/tasks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []))
      .catch(() => {});
  }, []);

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed' || t.status === 'error');
  const recentActivity = tasks.slice(0, 5).map(t => ({
    id: t.task_id,
    filename: (t.video_path || 'video').split('/').pop(),
    type: t.status,
    time: t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
  }));

  const quickStats = [
    { label: 'Videos Processed', value: String(completedTasks.length), icon: FileVideo },
    { label: 'Total Tasks', value: String(tasks.length), icon: Clock },
    { label: 'Accuracy Rate', value: '99.5%', icon: Target },
    { label: 'Failed', value: String(failedTasks.length), icon: AlertCircle },
  ];

  return (
    <div className="db-wrap">
      <CustomCursor /> 
      <FontImport />

      {/* Nav */}
      <nav className="db-nav">
        <div className="db-nav-inner">
          <Link to="/landing" className="nav-brand">
            <img src="/logo.png" alt="Mimir" className="nav-brand-logo" />
            <span className="nav-brand-name">Mimir</span>
          </Link>
          <div className="nav-links">
            <Link to="/upload" className="btn-primary">
              <Upload size={14} />
              Upload
            </Link>
            <Link to="/profile" className="nav-link">Profile</Link>
            <Link to="/landing" className="nav-link">Home</Link>
          </div>
        </div>
      </nav>

      <div className="db-page">
        {/* Welcome */}
        <div className="welcome-row">
          <p className="welcome-eyebrow">Dashboard</p>
          <h1 className="welcome-title">Welcome back<br />to <span>Mimir</span></h1>
          <p className="welcome-sub">Your video intelligence command centre</p>
        </div>

        {/* Stats */}
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

        {/* Main 2-col */}
        <div className="main-cols">
          {/* Hero CTA */}
          <div className="hero-card">
            <div className="hero-card-glow" />
            <div className="hero-card-glow2" />
            <p className="hero-eyebrow">Get started</p>
            <h2 className="hero-title">Process your<br />next video</h2>
            <p className="hero-desc">
              Upload a video to get accurate transcription, time-synchronised subtitles,
              AI-powered summaries, and keyframe extraction — all in one pipeline.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/upload" className="btn-primary">
                <Upload size={15} />
                Upload New Video
              </Link>
              <Link to="/landing" className="btn-ghost">
                <Play size={14} />
                View Demo
              </Link>
            </div>
          </div>

          {/* Activity */}
          <div className="activity-card">
            <p className="card-section-label">Latest</p>
            <div className="card-title">
              <Activity size={16} color="#facc15" />
              Recent Activity
            </div>

            <div className="activity-list">
              {recentActivity.length === 0 ? (
                <div className="activity-empty">No tasks yet — upload a video to start</div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="activity-item">
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <div className={statusDotClass(item.type)} />
                      <div style={{ minWidth: 0 }}>
                        <div className="activity-name">{item.filename}</div>
                        <div className="activity-status">{item.type}</div>
                      </div>
                    </div>
                    <div className="activity-time">{item.time}</div>
                  </div>
                ))
              )}
            </div>

            <Link to="/profile" className="view-all-link">
              View all activity <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="features-card">
          <p className="card-section-label" style={{ marginBottom: '0.5rem' }}>What Mimir can do</p>
          <div className="card-title" style={{ marginBottom: '1.5rem' }}>Platform Features</div>
          <div className="features-grid">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="feature-item">
                <div className="feature-icon-box">
                  <Icon size={16} color="#facc15" />
                </div>
                <div className="feature-name">{label}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="bottom-cols">
          {/* Quick actions */}
          <div className="actions-card">
            <p className="card-section-label" style={{ marginBottom: '0.5rem' }}>Shortcuts</p>
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Quick Actions</div>
            {[
              { to: '/upload', icon: Upload, label: 'Upload Video' },
              { to: '/profile', icon: FileVideo, label: 'View History' },
              { to: '/landing', icon: Play, label: 'View Demo' },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={label} to={to} className="quick-action-link">
                <div className="quick-action-left">
                  <div className="qa-icon">
                    <Icon size={15} color="#facc15" />
                  </div>
                  <span className="qa-label">{label}</span>
                </div>
                <ChevronRight size={15} color="rgba(219,234,254,0.35)" />
              </Link>
            ))}
          </div>

          {/* Upgrade */}
          <div className="upgrade-card">
            <p className="card-section-label">Pro Plan</p>
            <div className="upgrade-title">Go Pro</div>
            <p className="upgrade-desc">
              Unlock unlimited uploads, advanced features, and priority processing with Mimir Pro.
            </p>
            <div className="upgrade-perks">
              {['Unlimited video uploads', 'Priority GPU processing', 'Advanced RAG indexing', 'Dedicated support'].map(p => (
                <div key={p} className="upgrade-perk">
                  <div className="perk-dot" />
                  {p}
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Learn More
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;