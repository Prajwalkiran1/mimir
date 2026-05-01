import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Video, FileText, Download, Upload, Clock, Mic,
  FileVideo, Languages, Zap, Shield, Mail, Phone, MapPin,
  ChevronRight, Play, User, LogOut, ArrowDown, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─────────────────────────────────────────────
   HOOK: useInView — triggers when element enters viewport
───────────────────────────────────────────── */
const useInView = (options = {}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { threshold: 0.15, ...options });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
};

/* ─────────────────────────────────────────────
   CUSTOM CURSOR WITH TRAIL
───────────────────────────────────────────── */
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

    const onEnter = (e) => {
      if (e.target.closest('a, button, [role="button"]')) setHovering(true);
    };
    const onLeave = (e) => {
      if (e.target.closest('a, button, [role="button"]')) setHovering(false);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onEnter);
    document.addEventListener('mouseout', onLeave);

    const animate = () => {
      // Dot snaps instantly
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`;
      }
      // Ring lags behind
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        const s = hovering ? 2.2 : clicking ? 0.7 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px) scale(${s})`;
        ringRef.current.style.opacity = hovering ? '0.6' : '0.35';
        ringRef.current.style.borderColor = hovering ? '#facc15' : 'rgba(250,204,21,0.7)';
        ringRef.current.style.background = hovering ? 'rgba(250,204,21,0.06)' : 'transparent';
      }
      // Trail — each node chases the one before it
      positions.current = [
        { x: mouse.current.x, y: mouse.current.y },
        ...positions.current.slice(0, TRAIL_COUNT - 1),
      ];
      trailRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = positions.current[i];
        const scale = 1 - i / TRAIL_COUNT;
        const opacity = (1 - i / TRAIL_COUNT) * 0.55;
        el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px) scale(${scale})`;
        el.style.opacity = String(opacity);
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
      {/* Trail dots */}
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => trailRefs.current[i] = el}
          style={{
            position: 'fixed', top: 0, left: 0, zIndex: 99998,
            width: '6px', height: '6px', borderRadius: '50%',
            background: `hsl(${46 - i * 3}, ${95 - i * 4}%, ${60 - i * 3}%)`,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }}
        />
      ))}
      {/* Sharp dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 99999,
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#facc15',
          pointerEvents: 'none',
          boxShadow: '0 0 6px rgba(250,204,21,0.8)',
          willChange: 'transform',
          transition: 'width 0.15s, height 0.15s',
        }}
      />
      {/* Lagging ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 99997,
          width: '40px', height: '40px', borderRadius: '50%',
          border: '1.5px solid rgba(250,204,21,0.7)',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          transition: 'border-color 0.3s ease, background 0.3s ease, transform 0.1s ease',
        }}
      />
    </>
  );
};

/* ─────────────────────────────────────────────
   MAGNETIC BUTTON
───────────────────────────────────────────── */
const MagneticBtn = ({ children, className, ...props }) => {
  const ref = useRef(null);
  const handleMove = (e) => {
    const btn = ref.current;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };
  const handleLeave = () => { ref.current.style.transform = 'translate(0,0)'; };
  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{ transition: 'transform 0.3s cubic-bezier(0.23,1,0.32,1)' }}
      {...props}
    >{children}</button>
  );
};

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
const FeatureCard = ({ icon, title, description, index }) => {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s cubic-bezier(0.23,1,0.32,1) ${index * 0.1}s`,
      }}
      className="relative group cursor-default"
    >
      {/* Glow border effect */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: hovered ? 'linear-gradient(135deg, #facc15 0%, #3b82f6 100%)' : 'transparent',
        padding: '1px',
        transition: 'background 0.4s ease',
      }}>
        <div style={{
          height: '100%', borderRadius: '15px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        }} />
      </div>
      <div className="relative p-8 rounded-2xl h-full" style={{
        background: hovered
          ? 'linear-gradient(135deg, rgba(250,204,21,0.05) 0%, rgba(59,130,246,0.05) 100%)'
          : 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,58,95,0.9) 100%)',
        border: '1px solid rgba(250,204,21,0.12)',
        transition: 'background 0.4s ease',
      }}>
        <div style={{
          display: 'inline-flex', padding: '12px', borderRadius: '12px',
          background: hovered ? 'rgba(250,204,21,0.15)' : 'rgba(250,204,21,0.08)',
          marginBottom: '20px',
          transition: 'background 0.3s ease',
        }}>
          <span style={{ color: '#facc15', display: 'block' }}>{icon}</span>
        </div>
        <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, marginBottom: '12px', fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.02em', fontSize: '1.2rem' }}>{title}</h3>
        <p style={{ color: 'rgba(219,234,254,0.75)', lineHeight: 1.65, fontSize: '0.9rem' }}>{description}</p>
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px',
          opacity: hovered ? 1 : 0, transform: hovered ? 'translate(0,0)' : 'translate(4px,4px)',
          transition: 'all 0.3s ease', color: '#facc15',
        }}>
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP CARD for How It Works
───────────────────────────────────────────── */
const StepCard = ({ icon, number, title, description, index }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.95)',
      transition: `all 0.7s cubic-bezier(0.23,1,0.32,1) ${index * 0.15}s`,
    }}>
      <div className="relative" style={{
        background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.6))',
        border: '1px solid rgba(250,204,21,0.2)',
        borderRadius: '20px',
        overflow: 'hidden',
        padding: '0',
      }}>
        {/* Step number stripe */}
        <div style={{
          background: 'linear-gradient(90deg, #facc15 0%, rgba(250,204,21,0.3) 100%)',
          padding: '8px 24px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ color: '#0f172a', fontWeight: 900, fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.4rem', letterSpacing: '0.05em' }}>STEP {number}</span>
        </div>
        {/* Image placeholder */}
        <div style={{
          width: '100%', height: '180px',
          background: 'linear-gradient(135deg, rgba(250,204,21,0.05) 0%, rgba(59,130,246,0.1) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(250,204,21,0.1)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Placeholder grid lines */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(250,204,21,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ color: 'rgba(250,204,21,0.3)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
            <p style={{ color: 'rgba(250,204,21,0.4)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: '"Barlow Condensed", sans-serif' }}>[ Image Placeholder ]</p>
          </div>
        </div>
        {/* Content */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.35rem', letterSpacing: '0.04em', marginBottom: '10px' }}>{title}</h3>
          <p style={{ color: 'rgba(219,234,254,0.7)', fontSize: '0.875rem', lineHeight: 1.7 }}>{description}</p>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
const LandingPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setNavSolid(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: <Brain className="w-7 h-7" />, title: "AI-Powered Transcription", description: "Advanced deep learning models provide accurate video transcription with speaker identification" },
    { icon: <Clock className="w-7 h-7" />, title: "Time-Synchronized Subtitles", description: "Perfectly timed subtitles that sync with your video content automatically" },
    { icon: <FileText className="w-7 h-7" />, title: "Intelligent Summarization", description: "RAG-based summarization with keyframe extraction for comprehensive video understanding" },
    { icon: <Languages className="w-7 h-7" />, title: "Topic-Based Analysis", description: "Summarize content based on specific topics with cross-modal reasoning" },
    { icon: <Download className="w-7 h-7" />, title: "Multiple Formats", description: "Download transcripts, subtitles, and summaries in various formats" },
    { icon: <Shield className="w-7 h-7" />, title: "Secure & Private", description: "Enterprise-grade security with end-to-end encryption" },
  ];

  const steps = [
    { icon: <FileVideo size={48} />, number: "01", title: "Upload Video", description: "Upload your video file in any format. MP4, MOV, AVI — Mimir handles everything." },
    { icon: <Zap size={48} />, number: "02", title: "AI Processing", description: "Whisper & Gemini analyse audio, visuals, and context in one unified pipeline." },
    { icon: <Download size={48} />, number: "03", title: "Download Results", description: "Get transcripts, time-synced subtitles, and rich AI summaries — ready to use." },
  ];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&family=Cinzel+Decorative:wght@700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        body { background: #03091a; }

        .mimir-page {
          font-family: 'Barlow', sans-serif;
          background: #03091a;
          min-height: 100vh;
          overflow-x: hidden;
          color: #fff;
        }

        /* ── Noise texture overlay ── */
        .mimir-page::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          opacity: 0.4;
        }

        /* ── Nav ── */
        .mimir-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 clamp(16px, 4vw, 48px);
          height: 70px;
          display: flex; align-items: center; justify-content: space-between;
          transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease;
        }
        .mimir-nav.solid {
          background: rgba(3,9,26,0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(250,204,21,0.12);
        }

        .nav-logo-text {
          font-family: 'Cinzel Decorative', cursive;
          font-size: 1.6rem;
          font-weight: 700;
          color: #facc15;
          letter-spacing: 0.04em;
          text-decoration: none;
        }

        .nav-link {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          position: relative;
          padding-bottom: 2px;
          transition: color 0.25s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute; bottom: -2px; left: 0; right: 100%;
          height: 2px; background: #facc15;
          transition: right 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        .nav-link:hover { color: #facc15; }
        .nav-link:hover::after { right: 0; }

        /* ── CTA Buttons ── */
        .btn-primary {
          background: #facc15;
          color: #03091a;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 14px 36px;
          border-radius: 4px;
          border: none; cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
          transition: background 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease;
          box-shadow: 0 0 0 rgba(250,204,21,0);
          position: relative; overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .btn-primary:hover { background: #ffe566; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(250,204,21,0.35); }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          background: transparent;
          color: rgba(255,255,255,0.85);
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 13px 34px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.25);
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px;
          text-decoration: none;
          transition: all 0.25s ease;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }
        .btn-ghost:hover { border-color: rgba(250,204,21,0.5); color: #facc15; background: rgba(250,204,21,0.06); }

        .btn-danger {
          background: rgba(220,38,38,0.15);
          color: #fca5a5;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 4px;
          border: 1px solid rgba(220,38,38,0.3);
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          text-decoration: none;
          transition: all 0.25s ease;
        }
        .btn-danger:hover { background: rgba(220,38,38,0.3); border-color: rgba(220,38,38,0.6); }

        /* ── Hero ── */
        .hero-section {
          position: relative; min-height: 100vh;
          display: flex; align-items: center;
          overflow: hidden;
          padding-top: 70px;
        }

        .hero-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(250,204,21,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(250,204,21,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 100%);
        }

        .hero-bg-glow {
          position: absolute;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%);
          top: -200px; right: -200px;
          animation: floatGlow 8s ease-in-out infinite;
        }
        .hero-bg-glow2 {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%);
          bottom: -100px; left: -100px;
          animation: floatGlow 10s ease-in-out infinite reverse;
        }

        @keyframes floatGlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
        }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(250,204,21,0.1);
          border: 1px solid rgba(250,204,21,0.25);
          border-radius: 100px;
          padding: 6px 16px;
          margin-bottom: 24px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase;
          color: #facc15;
          animation: fadeSlideDown 0.8s ease 0.2s both;
        }

        .hero-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: clamp(3rem, 7vw, 5.5rem);
          line-height: 0.95;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: #fff;
          animation: fadeSlideUp 0.9s ease 0.3s both;
        }

        .hero-title .accent { color: #facc15; }
        .hero-title .outline {
          -webkit-text-stroke: 2px #facc15;
          color: transparent;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          line-height: 1.7;
          color: rgba(219,234,254,0.75);
          max-width: 520px;
          margin: 24px 0 40px;
          animation: fadeSlideUp 0.9s ease 0.5s both;
        }

        .hero-btns {
          display: flex; flex-wrap: wrap; gap: 16px;
          animation: fadeSlideUp 0.9s ease 0.65s both;
        }

        /* ── Hero stats card ── */
        .hero-stats-panel {
          position: relative;
          background: linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,58,95,0.5));
          border: 1px solid rgba(250,204,21,0.2);
          border-radius: 16px;
          overflow: hidden;
          padding: 32px;
          backdrop-filter: blur(20px);
          animation: fadeIn 1s ease 0.8s both;
        }
        .hero-stats-panel::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #facc15 0%, rgba(250,204,21,0.3) 100%);
        }

        .mini-card {
          background: rgba(250,204,21,0.07);
          border: 1px solid rgba(250,204,21,0.15);
          border-radius: 10px;
          padding: 16px;
          transition: all 0.3s ease;
        }
        .mini-card:hover {
          background: rgba(250,204,21,0.12);
          border-color: rgba(250,204,21,0.3);
          transform: translateY(-2px);
        }

        /* ── Section headers ── */
        .section-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #facc15;
          margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: clamp(2rem, 4vw, 3rem);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #fff;
          line-height: 1.05;
        }
        .section-title span { color: #facc15; }

        /* ── Custom cursor ── */
        *, *::before, *::after { cursor: none !important; }

        /* ── Contact card ── */
        .contact-card {
          background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,58,95,0.5));
          border: 1px solid rgba(250,204,21,0.15);
          border-radius: 16px;
          padding: 36px;
          text-align: center;
          transition: all 0.35s cubic-bezier(0.23,1,0.32,1);
          position: relative; overflow: hidden;
        }
        .contact-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(250,204,21,0.05) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.35s ease;
        }
        .contact-card:hover { transform: translateY(-6px); border-color: rgba(250,204,21,0.35); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(250,204,21,0.08); }
        .contact-card:hover::before { opacity: 1; }

        /* ── Footer ── */
        .mimir-footer {
          background: #03091a;
          border-top: 1px solid rgba(250,204,21,0.1);
          padding: 60px 0 32px;
        }

        /* ── Divider ── */
        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(250,204,21,0.2) 30%, rgba(250,204,21,0.2) 70%, transparent);
        }

        /* ── Keyframes ── */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #03091a; }
        ::-webkit-scrollbar-thumb { background: rgba(250,204,21,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(250,204,21,0.5); }

        /* ── Mobile nav ── */
        .mobile-menu {
          position: fixed; top: 70px; left: 0; right: 0;
          background: rgba(3,9,26,0.97);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(250,204,21,0.15);
          padding: 24px;
          z-index: 99;
          display: flex; flex-direction: column; gap: 20px;
          transform-origin: top;
          transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
        }

        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-stats-panel { display: none; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }

        }
      `}</style>

      <CustomCursor />
      <div className="mimir-page">

        {/* ── NAV ── */}
        <nav className={`mimir-nav ${navSolid ? 'solid' : ''}`}>
          <Link to="/landing" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Mimir" style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '2px solid rgba(250,204,21,0.4)',
              transition: 'border-color 0.3s ease',
            }} />
            <span className="nav-logo-text">Mimir</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '36px' }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#contact" className="nav-link">Contact</a>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, letterSpacing: '0.05em', transition: 'color 0.25s ease' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#facc15'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                >
                  <User size={16} />
                  <span>{user?.username}</span>
                </Link>
                <button onClick={logout} className="btn-danger">
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.85rem' }}>Sign In</Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#facc15', padding: '8px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '24px', height: '2px', background: '#facc15',
                  transition: 'all 0.3s ease',
                  transform: menuOpen && i === 0 ? 'rotate(45deg) translate(5px, 5px)' : menuOpen && i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </div>
          </button>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mobile-menu md:hidden">
            <a href="#features" className="nav-link" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="nav-link" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#contact" className="nav-link" onClick={() => setMenuOpen(false)}>Contact</a>
            {isAuthenticated ? (
              <>
                <Link to="/profile" style={{ textDecoration: 'none' }}><span className="nav-link">Profile</span></Link>
                <button onClick={logout} className="btn-danger" style={{ alignSelf: 'flex-start' }}>
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Sign In</Link>
            )}
          </div>
        )}

        {/* ── HERO ── */}
        <section className="hero-section">
          <div className="hero-bg-grid" />
          <div className="hero-bg-glow" />
          <div className="hero-bg-glow2" />

          <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)', position: 'relative', zIndex: 1 }}>
            <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
              {/* Left */}
              <div>
                <div className="hero-eyebrow">
                  <Sparkles size={12} />
                  AI-Powered Video Intelligence
                </div>
                <h1 className="hero-title">
                  Turn any<br />
                  video into<br />
                  <span className="outline">structured</span><br />
                  <span className="accent">knowledge.</span>
                </h1>
                <p className="hero-subtitle">
                  Transcription, subtitles, AI summaries, and semantic search — all in one pipeline. Drop a video and walk away with everything.
                </p>
                <div className="hero-btns">
                  {isAuthenticated ? (
                    <Link to="/dashboard" className="btn-primary">
                      Go to Dashboard <ChevronRight size={18} />
                    </Link>
                  ) : (
                    <Link to="/upload" className="btn-primary">
                      Upload a Video <Upload size={18} />
                    </Link>
                  )}
                  <a href="#how-it-works" className="btn-ghost">
                    How it works <ArrowDown size={16} />
                  </a>
                </div>
              </div>

              {/* Right — Stats panel */}
              <div className="hero-stats-panel">
                <p className="section-label" style={{ marginBottom: '24px' }}>What you get</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[
                    { icon: <Video size={22} />, title: 'Video Upload', sub: 'Drag & drop any format' },
                    { icon: <Mic size={22} />, title: 'Transcription', sub: 'Whisper-powered accuracy' },
                    { icon: <FileText size={22} />, title: 'AI Summary', sub: 'Gemini-powered insights' },
                    { icon: <Download size={22} />, title: 'Export', sub: 'SRT, TXT, and more' },
                  ].map((item, i) => (
                    <div key={i} className="mini-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ color: '#facc15', flexShrink: 0, marginTop: '2px' }}>{item.icon}</div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem', letterSpacing: '0.03em' }}>{item.title}</p>
                        <p style={{ color: 'rgba(219,234,254,0.6)', fontSize: '0.75rem', marginTop: '3px' }}>{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Processing indicator */}
                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(250,204,21,0.06)', borderRadius: '10px', border: '1px solid rgba(250,204,21,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(250,204,21,0.2)' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#facc15', animation: 'spin 1.2s linear infinite' }} />
                  </div>
                  <div>
                    <p style={{ color: '#facc15', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em' }}>READY TO PROCESS</p>
                    <p style={{ color: 'rgba(219,234,254,0.5)', fontSize: '0.73rem', marginTop: '2px' }}>Upload your first video to get started</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <a href="#features" style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none', animation: 'fadeIn 1s ease 1.5s both' }}>
            <span style={{ color: 'rgba(250,204,21,0.5)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Scroll</span>
            <div style={{ width: '1px', height: '40px', background: 'linear-gradient(180deg, rgba(250,204,21,0.5) 0%, transparent 100%)', animation: 'pulse 2s ease infinite' }} />
          </a>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ padding: 'clamp(60px,8vw,120px) 0', background: 'linear-gradient(180deg, #03091a 0%, #071020 100%)', position: 'relative' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)' }}>
            {/* Header */}
            <div style={{ marginBottom: '64px' }}>
              <FeatureHeader />
            </div>

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {features.map((f, i) => (
                <FeatureCard key={i} {...f} index={i} />
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ padding: 'clamp(60px,8vw,120px) 0', background: 'linear-gradient(180deg, #071020 0%, #03091a 100%)', position: 'relative' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)' }}>
            <HowItWorksHeader />
            <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', marginTop: '60px' }}>
              {steps.map((s, i) => (
                <StepCard key={i} {...s} index={i} />
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" />

        {/* ── CONTACT ── */}
        <section id="contact" style={{ padding: 'clamp(60px,8vw,120px) 0', background: '#03091a' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)' }}>
            <ContactHeader />
            <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '60px' }}>
              {[
                { icon: <Mail size={36} />, title: 'Email', value: 'support@mimir.ai' },
                { icon: <Phone size={36} />, title: 'Phone', value: '+1 (555) 123-4567' },
                { icon: <MapPin size={36} />, title: 'Office', value: 'San Francisco, CA' },
              ].map((c, i) => (
                <ContactCard key={i} {...c} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="mimir-footer">
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)' }}>
            <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '48px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <img src="/logo.png" alt="Mimir" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(250,204,21,0.4)' }} />
                  <span style={{ fontFamily: '"Cinzel Decorative", cursive', fontSize: '1.4rem', fontWeight: 700, color: '#facc15' }}>Mimir</span>
                </div>
                <p style={{ color: 'rgba(219,234,254,0.5)', lineHeight: 1.7, fontSize: '0.9rem', maxWidth: '300px' }}>
                  Transforming video content with AI-powered intelligence. Extract every insight, automatically.
                </p>
              </div>
              <div>
                <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#facc15', marginBottom: '20px' }}>Quick Links</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['#features', '#how-it-works', '#contact'].map((href, i) => (
                    <a key={i} href={href} style={{ color: 'rgba(219,234,254,0.6)', textDecoration: 'none', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem', letterSpacing: '0.04em', transition: 'color 0.25s ease' }}
                      onMouseEnter={e => e.target.style.color = '#facc15'}
                      onMouseLeave={e => e.target.style.color = 'rgba(219,234,254,0.6)'}
                    >
                      {href.replace('#', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(250,204,21,0.1)', paddingTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ color: 'rgba(219,234,254,0.35)', fontSize: '0.8rem', fontFamily: '"Barlow Condensed", sans-serif', letterSpacing: '0.08em' }}>
                © 2026 MIMIR. ALL RIGHTS RESERVED.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

/* ── Sub-components for animated section headers ── */
const FeatureHeader = () => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ textAlign: 'center', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.7s ease' }}>
      <p className="section-label">Capabilities</p>
      <h2 className="section-title">Powerful Features for<br /><span>Modern Video Analysis</span></h2>
      <p style={{ color: 'rgba(219,234,254,0.65)', marginTop: '16px', fontSize: '1rem', maxWidth: '600px', margin: '16px auto 0', lineHeight: 1.7 }}>
        Leverage cutting-edge AI technology to extract maximum value from your video content
      </p>
    </div>
  );
};

const HowItWorksHeader = () => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ textAlign: 'center', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.7s ease' }}>
      <p className="section-label">Process</p>
      <h2 className="section-title">How <span>Mimir</span> Works</h2>
      <p style={{ color: 'rgba(219,234,254,0.65)', marginTop: '16px', fontSize: '1rem', maxWidth: '480px', margin: '16px auto 0', lineHeight: 1.7 }}>
        Three steps to transform your videos into structured, searchable knowledge
      </p>
    </div>
  );
};

const ContactHeader = () => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ textAlign: 'center', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.7s ease' }}>
      <p className="section-label">Contact</p>
      <h2 className="section-title">Get in <span>Touch</span></h2>
      <p style={{ color: 'rgba(219,234,254,0.65)', marginTop: '16px', fontSize: '1rem', lineHeight: 1.7 }}>
        We'd love to hear from you
      </p>
    </div>
  );
};

const ContactCard = ({ icon, title, value, index }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(40px)', transition: `all 0.6s ease ${index * 0.12}s` }}>
      <div className="contact-card">
        <div style={{ color: '#facc15', display: 'flex', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
          <div style={{ padding: '18px', background: 'rgba(250,204,21,0.08)', borderRadius: '14px', border: '1px solid rgba(250,204,21,0.15)' }}>
            {icon}
          </div>
        </div>
        <h3 style={{ color: '#fff', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{title}</h3>
        <p style={{ color: 'rgba(219,234,254,0.65)', fontSize: '0.9rem' }}>{value}</p>
      </div>
    </div>
  );
};

export default LandingPage;