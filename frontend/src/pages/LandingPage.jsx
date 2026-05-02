import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Video, FileText, Download, Upload, Clock, Mic,
  FileVideo, Languages, Zap, Shield, Mail, Phone, MapPin,
  ChevronRight, Play, User, LogOut, ArrowDown, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Fonts ──────────────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --bg:          #0a0f1a;
      --bg-mid:      #0d1520;
      --bg-light:    #111d2a;
      --glass-bg:    rgba(20, 35, 55, 0.50);
      --glass-border:rgba(201, 168, 76, 0.18);
      --glass-shine: rgba(240, 210, 130, 0.07);
      --gold:        #c9a84c;
      --gold-bright: #f0d070;
      --gold-dim:    rgba(201, 168, 76, 0.55);
      --gold-faint:  rgba(201, 168, 76, 0.14);
      --teal:        #c9a84c;
      --teal-dim:    rgba(201, 168, 76, 0.55);
      --teal-faint:  rgba(201, 168, 76, 0.18);
      --white:       #fdf8ee;
      --text:        rgba(248, 235, 190, 0.82);
      --text-dim:    rgba(220, 195, 130, 0.5);
      --font-serif:  'DM Serif Display', Georgia, serif;
      --font-sans:   'DM Sans', sans-serif;
      --font-brand:  'Cinzel Decorative', cursive;
      --radius-lg:   20px;
      --radius-xl:   28px;
    }

    body { background: var(--bg); overflow-x: hidden; }

    .lp { font-family: var(--font-sans); color: var(--white); background: var(--bg); min-height: 100vh; position: relative; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 3px; }

    /* ── Nav ── */
    .lp-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      height: 66px;
      display: flex; align-items: center;
      padding: 0 clamp(20px, 5vw, 72px);
      justify-content: space-between;
      transition: background 0.5s ease, backdrop-filter 0.5s ease, border-color 0.5s ease;
      border-bottom: 1px solid transparent;
    }
    .lp-nav.scrolled {
      background: rgba(10, 26, 26, 0.72);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border-color: var(--glass-border);
    }

    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .nav-brand img { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(201,168,76,0.3); }
    .nav-brand-name { font-family: var(--font-brand); font-size: 1.2rem; color: var(--teal); letter-spacing: 0.02em; }

    .nav-links { display: flex; align-items: center; gap: 2.5rem; }

    .nav-a {
      font-family: var(--font-sans); font-size: 0.82rem; font-weight: 500; letter-spacing: 0.04em;
      color: var(--text); text-decoration: none; transition: color 0.25s;
    }
    .nav-a:hover { color: var(--teal); }

    /* Liquid glass button */
    .btn-glass {
      font-family: var(--font-sans); font-size: 0.82rem; font-weight: 500;
      letter-spacing: 0.04em;
      padding: 9px 22px; border-radius: 100px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--white); cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 7px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: inset 0 1px 0 var(--glass-shine), 0 4px 16px rgba(0,0,0,0.25);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
      position: relative; overflow: hidden;
    }
    .btn-glass::after {
      content: '';
      position: absolute; inset: 0; border-radius: 100px;
      background: radial-gradient(circle at 50% 0%, rgba(160,240,220,0.18) 0%, transparent 70%);
      opacity: 0; transition: opacity 0.3s;
    }
    .btn-glass:hover { border-color: rgba(201,168,76,0.4); box-shadow: inset 0 1px 0 rgba(160,240,220,0.14), 0 8px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.12); transform: translateY(-1px); }
    .btn-glass:hover::after { opacity: 1; }

    .btn-teal {
      font-family: var(--font-sans); font-size: 0.85rem; font-weight: 500;
      padding: 11px 28px; border-radius: 100px;
      background: linear-gradient(135deg, rgba(201,168,76,0.9) 0%, rgba(80,190,175,0.9) 100%);
      border: 1px solid rgba(160,240,220,0.3);
      color: #061414; cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 8px;
      backdrop-filter: blur(8px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 24px rgba(201,168,76,0.22);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-teal:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 36px rgba(201,168,76,0.32); }

    .btn-outline {
      font-family: var(--font-sans); font-size: 0.85rem; font-weight: 400;
      padding: 10px 26px; border-radius: 100px;
      background: transparent;
      border: 1px solid rgba(220,248,242,0.2);
      color: var(--text); cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 8px;
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-outline:hover { border-color: rgba(201,168,76,0.4); color: var(--teal); }

    /* ── Hero ── */
    .hero {
      min-height: 100vh; position: relative;
      display: flex; align-items: center;
      padding-top: 66px;
      overflow: hidden;
    }

    /* BG image placeholder zone */
    .hero-bg-image {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(10,26,26,0.72) 0%, rgba(10,26,26,0.5) 50%, rgba(10,26,26,0.92) 100%),
        linear-gradient(135deg, #0a1a1a 0%, #0d2a28 50%, #091c1c 100%);
      /* ↑ REPLACE the second gradient with: url('/images/hero-bg.jpg') center/cover no-repeat */
    }

    /* Orbs */
    .orb {
      position: absolute; border-radius: 50%; pointer-events: none;
      filter: blur(70px);
    }
    .orb-1 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 70%);
      top: -150px; right: 5%;
      animation: orbDrift 12s ease-in-out infinite;
    }
    .orb-2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(80,160,150,0.07) 0%, transparent 70%);
      bottom: 10%; left: -100px;
      animation: orbDrift 16s ease-in-out infinite reverse;
    }
    .orb-3 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%);
      top: 40%; left: 40%;
      animation: orbDrift 20s ease-in-out infinite 4s;
    }

    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(18px,-25px) scale(1.04); }
      66% { transform: translate(-14px,12px) scale(0.97); }
    }

    /* Fine mesh */
    .hero-mesh {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 10%, transparent 80%);
    }

    .hero-inner {
      position: relative; z-index: 2;
      max-width: 1200px; margin: 0 auto;
      padding: 0 clamp(20px,5vw,72px);
      display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
    }

    @media (max-width: 860px) {
      .hero-inner { grid-template-columns: 1fr; gap: 48px; }
      .hero-right { display: none; }
    }

    /* Eyebrow pill */
    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 5px 14px 5px 8px; border-radius: 100px;
      background: rgba(201,168,76,0.08);
      border: 1px solid rgba(201,168,76,0.2);
      font-size: 0.72rem; font-weight: 500; letter-spacing: 0.1em;
      color: var(--teal); text-transform: uppercase; margin-bottom: 28px;
      animation: riseIn 0.8s cubic-bezier(0.23,1,0.32,1) 0.2s both;
    }

    .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }

    .hero-h1 {
      font-family: var(--font-serif); font-size: clamp(2.8rem, 5vw, 4.4rem);
      font-weight: 400; line-height: 1.08; color: var(--white);
      margin-bottom: 24px; letter-spacing: -0.01em;
      animation: riseIn 0.9s cubic-bezier(0.23,1,0.32,1) 0.35s both;
    }
    .hero-h1 em { font-style: italic; color: var(--teal); }

    .hero-p {
      font-size: 1.02rem; line-height: 1.75; color: var(--text);
      font-weight: 300; max-width: 440px; margin-bottom: 40px;
      animation: riseIn 0.9s cubic-bezier(0.23,1,0.32,1) 0.5s both;
    }

    .hero-btns {
      display: flex; gap: 14px; flex-wrap: wrap;
      animation: riseIn 0.9s cubic-bezier(0.23,1,0.32,1) 0.65s both;
    }

    @keyframes riseIn {
      from { opacity: 0; transform: translateY(22px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Liquid Glass hero panel ── */
    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(32px) saturate(160%) brightness(1.05);
      -webkit-backdrop-filter: blur(32px) saturate(160%) brightness(1.05);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      box-shadow:
        inset 0 1.5px 0 var(--glass-shine),
        inset 0 -1px 0 rgba(0,0,0,0.12),
        0 24px 64px rgba(0,0,0,0.45);
      position: relative; overflow: hidden;
      animation: riseIn 1s cubic-bezier(0.23,1,0.32,1) 0.7s both;
    }
    /* Specular highlight */
    .glass-panel::before {
      content: '';
      position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.35), transparent);
      pointer-events: none;
    }
    /* Inner refraction shimmer */
    .glass-panel::after {
      content: '';
      position: absolute; top: -30%; left: -20%;
      width: 140%; height: 60%;
      background: radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%);
      pointer-events: none;
    }

    .panel-inner { padding: 28px 28px 24px; position: relative; z-index: 1; }

    .panel-label {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 20px;
    }

    .panel-items { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .panel-item {
      background: rgba(10,30,28,0.5);
      border: 1px solid rgba(201,168,76,0.1);
      border-radius: 14px; padding: 14px;
      display: flex; align-items: flex-start; gap: 11px;
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .panel-item:hover {
      border-color: rgba(201,168,76,0.25);
      background: rgba(10,40,36,0.6);
      transform: translateY(-2px);
    }

    .pi-icon {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      background: rgba(201,168,76,0.1); display: flex; align-items: center; justify-content: center;
    }
    .pi-title { font-size: 0.82rem; font-weight: 500; color: var(--white); }
    .pi-sub { font-size: 0.7rem; color: var(--text-dim); margin-top: 2px; line-height: 1.4; }

    /* Status strip */
    .panel-status {
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(10,30,28,0.55);
      border: 1px solid rgba(201,168,76,0.1);
      border-radius: 12px;
      display: flex; align-items: center; gap: 12px;
    }
    .status-ring {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; position: relative;
    }
    .status-ring-track {
      position: absolute; inset: 0; border-radius: 50%;
      border: 1.5px solid rgba(201,168,76,0.15);
    }
    .status-ring-spin {
      position: absolute; inset: 0; border-radius: 50%;
      border: 1.5px solid transparent;
      border-top-color: var(--teal);
      animation: spin 1.4s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Scroll cue ── */
    .scroll-cue {
      position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      z-index: 2;
      animation: riseIn 1s ease 1.5s both;
    }
    .scroll-line {
      width: 1px; height: 48px;
      background: linear-gradient(180deg, var(--teal-dim) 0%, transparent 100%);
      animation: scrollPulse 2s ease-in-out infinite;
    }
    @keyframes scrollPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
    .scroll-label { font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-dim); }

    /* ── Section shell ── */
    .section {
      max-width: 1200px; margin: 0 auto;
      padding: clamp(80px,10vw,140px) clamp(20px,5vw,72px);
    }

    .section-bg-alt { background: linear-gradient(180deg, var(--bg) 0%, var(--bg-mid) 100%); }
    .section-bg-mid { background: linear-gradient(180deg, var(--bg-mid) 0%, var(--bg) 100%); }

    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201,168,76,0.14) 30%, rgba(201,168,76,0.14) 70%, transparent);
    }

    /* Section header */
    .sh { margin-bottom: 64px; }
    .sh-eye {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 14px;
    }
    .sh-title {
      font-family: var(--font-serif); font-size: clamp(1.9rem,3.5vw,2.9rem);
      font-weight: 400; color: var(--white); line-height: 1.1; margin-bottom: 16px;
    }
    .sh-title em { color: var(--teal); font-style: italic; }
    .sh-sub { font-size: 0.95rem; color: var(--text); font-weight: 300; line-height: 1.75; max-width: 480px; }

    /* ── Feature cards ── */
    .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    @media (max-width: 900px) { .features-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .features-grid { grid-template-columns: 1fr; } }

    .feat-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 28px 24px;
      position: relative; overflow: hidden;
      box-shadow: inset 0 1px 0 var(--glass-shine), 0 8px 32px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
      cursor: default;
    }
    .feat-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
    }
    .feat-card:hover {
      transform: translateY(-5px);
      border-color: rgba(201,168,76,0.3);
      box-shadow: inset 0 1px 0 rgba(200,255,245,0.12), 0 20px 56px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,76,0.08);
    }

    /* Hover glow layer */
    .feat-card-glow {
      position: absolute; inset: 0; border-radius: inherit;
      background: radial-gradient(circle at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 65%);
      opacity: 0; transition: opacity 0.4s;
      pointer-events: none;
    }
    .feat-card:hover .feat-card-glow { opacity: 1; }

    .feat-icon {
      width: 42px; height: 42px; border-radius: 12px;
      background: rgba(201,168,76,0.09);
      border: 1px solid rgba(201,168,76,0.15);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px; position: relative; z-index: 1;
      transition: background 0.3s;
    }
    .feat-card:hover .feat-icon { background: rgba(201,168,76,0.15); }

    .feat-title {
      font-family: var(--font-serif); font-size: 1.05rem;
      color: var(--white); margin-bottom: 10px; position: relative; z-index: 1;
    }
    .feat-desc { font-size: 0.82rem; color: var(--text); line-height: 1.7; font-weight: 300; position: relative; z-index: 1; }

    /* ── How it works ── */
    .steps-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
    @media (max-width: 780px) { .steps-grid { grid-template-columns: 1fr; } }

    .step-card {
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 var(--glass-shine), 0 12px 40px rgba(0,0,0,0.35);
      transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
    }
    .step-card:hover { transform: translateY(-6px); border-color: rgba(201,168,76,0.28); box-shadow: inset 0 1px 0 rgba(200,255,245,0.12), 0 24px 64px rgba(0,0,0,0.5); }

    /* Image zone */
    .step-img-zone {
      width: 100%; height: 200px;
      position: relative; overflow: hidden;
      border-bottom: 1px solid var(--glass-border);
      background:
        linear-gradient(180deg, rgba(10,30,28,0.6) 0%, rgba(10,30,28,0.85) 100%),
        linear-gradient(135deg, #0d2826 0%, #091e1c 100%);
      /* ↑ REPLACE second gradient with the step's image – see notes below */
      display: flex; align-items: center; justify-content: center;
    }

    .step-img-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
    }

    .step-img-icon { color: rgba(201,168,76,0.35); position: relative; z-index: 1; }

    .step-img-placeholder {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: rgba(201,168,76,0.25); white-space: nowrap;
    }

    /* Step number */
    .step-num {
      position: absolute; top: 14px; left: 18px;
      font-family: var(--font-serif); font-size: 0.72rem; font-style: italic;
      color: rgba(201,168,76,0.45); letter-spacing: 0.05em;
    }

    .step-content { padding: 22px 24px 26px; }

    .step-title {
      font-family: var(--font-serif); font-size: 1.1rem;
      color: var(--white); margin-bottom: 8px;
    }
    .step-desc { font-size: 0.82rem; color: var(--text); line-height: 1.7; font-weight: 300; }

    /* Step connector line (desktop) */
    .steps-connector {
      display: grid; grid-template-columns: repeat(3,1fr);
      gap: 28px; margin-bottom: -14px; pointer-events: none;
    }
    @media (max-width: 780px) { .steps-connector { display: none; } }
    .connector-cell { display: flex; align-items: center; justify-content: center; }
    .connector-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05)); margin: 0 20px; }

    /* ── Contact ── */
    .contact-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    @media (max-width: 760px) { .contact-grid { grid-template-columns: 1fr; } }

    .contact-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 36px 28px;
      text-align: center;
      box-shadow: inset 0 1px 0 var(--glass-shine), 0 8px 32px rgba(0,0,0,0.28);
      transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
      position: relative; overflow: hidden;
    }
    .contact-card::before {
      content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(201,168,76,0.28), transparent);
    }
    .contact-card:hover { transform: translateY(-5px); border-color: rgba(201,168,76,0.28); box-shadow: inset 0 1px 0 rgba(200,255,245,0.1), 0 20px 56px rgba(0,0,0,0.45); }

    .c-icon-wrap {
      width: 52px; height: 52px; border-radius: 16px; margin: 0 auto 20px;
      background: rgba(201,168,76,0.09); border: 1px solid rgba(201,168,76,0.18);
      display: flex; align-items: center; justify-content: center;
    }
    .c-title { font-family: var(--font-serif); font-size: 1.05rem; color: var(--white); margin-bottom: 8px; }
    .c-val { font-size: 0.84rem; color: var(--text); font-weight: 300; }

    /* ── Footer ── */
    .lp-footer {
      border-top: 1px solid rgba(201,168,76,0.1);
      padding: 56px clamp(20px,5vw,72px) 32px;
      max-width: 100%;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 48px;
      margin-bottom: 48px;
    }
    @media (max-width: 700px) { .footer-inner { grid-template-columns: 1fr; gap: 32px; } }

    .footer-brand-name { font-family: var(--font-brand); font-size: 1.15rem; color: var(--teal); }
    .footer-p { font-size: 0.82rem; color: var(--text-dim); line-height: 1.75; font-weight: 300; margin-top: 12px; max-width: 260px; }
    .footer-col-label { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--teal-dim); margin-bottom: 18px; }
    .footer-link {
      display: block; font-size: 0.82rem; color: var(--text-dim); text-decoration: none;
      margin-bottom: 12px; transition: color 0.25s; font-weight: 300;
    }
    .footer-link:hover { color: var(--teal); }
    .footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid rgba(201,168,76,0.08); padding-top: 24px; text-align: center; }
    .footer-copy { font-size: 0.72rem; letter-spacing: 0.08em; color: var(--text-dim); }

    /* ── Mobile nav ── */
    .mobile-menu {
      position: fixed; top: 66px; left: 0; right: 0; z-index: 190;
      background: rgba(10,26,26,0.92);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-bottom: 1px solid var(--glass-border);
      padding: 28px clamp(20px,5vw,72px);
      display: flex; flex-direction: column; gap: 22px;
    }

    /* ── Scroll reveal ── */
    .reveal {
      opacity: 0; transform: translateY(28px);
      transition: opacity 0.75s cubic-bezier(0.23,1,0.32,1), transform 0.75s cubic-bezier(0.23,1,0.32,1);
    }
    .reveal.visible { opacity: 1; transform: translateY(0); }

    /* ── Danger btn ── */
    .btn-danger {
      font-family: var(--font-sans); font-size: 0.8rem; font-weight: 500;
      padding: 7px 16px; border-radius: 100px;
      background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25);
      color: #fca5a5; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    .btn-danger:hover { background: rgba(220,38,38,0.2); border-color: rgba(220,38,38,0.5); }

    /* ── Animated underline for hero heading ── */
    .hero-h1 .teal-word {
      display: inline-block; position: relative;
    }
    .hero-h1 .teal-word::after {
      content: '';
      position: absolute; bottom: 2px; left: 0; right: 0;
      height: 2px; background: var(--teal); border-radius: 1px;
      transform: scaleX(0); transform-origin: left;
      animation: lineGrow 0.7s cubic-bezier(0.23,1,0.32,1) 1.2s forwards;
    }
    @keyframes lineGrow { to { transform: scaleX(1); } }
  `}</style>
);

/* ─── useInView ─────────────────────────────────────────────────────────────── */
const useInView = (delay = 0) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => el.classList.add('visible'), delay);
        obs.disconnect();
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
};

/* ─── Feature Card ──────────────────────────────────────────────────────────── */
const FeatCard = ({ icon: Icon, title, desc, delay }) => {
  const ref = useInView(delay);
  return (
    <div ref={ref} className="feat-card reveal">
      <div className="feat-card-glow" />
      <div className="feat-icon"><Icon size={18} color="rgba(201,168,76,0.85)" /></div>
      <div className="feat-title">{title}</div>
      <div className="feat-desc">{desc}</div>
    </div>
  );
};

/* ─── Step Card ─────────────────────────────────────────────────────────────── */
const StepCard = ({ icon: Icon, num, title, desc, placeholder, delay }) => {
  const ref = useInView(delay);
  return (
    <div ref={ref} className="step-card reveal">
      <div className="step-img-zone">
        <div className="step-img-grid" />
        <div className="step-num">Step {num}</div>
        <Icon size={52} className="step-img-icon" />
        <div className="step-img-placeholder">[ {placeholder} ]</div>
      </div>
      <div className="step-content">
        <div className="step-title">{title}</div>
        <div className="step-desc">{desc}</div>
      </div>
    </div>
  );
};

/* ─── Contact Card ──────────────────────────────────────────────────────────── */
const ContactCard = ({ icon: Icon, title, value, delay }) => {
  const ref = useInView(delay);
  return (
    <div ref={ref} className="contact-card reveal">
      <div className="c-icon-wrap"><Icon size={20} color="rgba(201,168,76,0.8)" /></div>
      <div className="c-title">{title}</div>
      <div className="c-val">{value}</div>
    </div>
  );
};

/* ─── SectionHeader ─────────────────────────────────────────────────────────── */
const SectionHeader = ({ eye, title, sub, center }) => {
  const ref = useInView(0);
  return (
    <div ref={ref} className="sh reveal" style={center ? { textAlign: 'center' } : {}}>
      <div className="sh-eye">{eye}</div>
      <h2 className="sh-title" dangerouslySetInnerHTML={{ __html: title }} />
      {sub && <p className="sh-sub" style={center ? { margin: '0 auto' } : {}}>{sub}</p>}
    </div>
  );
};

/* ─── Main ─────────────────────────────────────────────────────────────────── */
const LandingPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const FEATURES = [
    { icon: Brain,     title: 'AI Transcription',      desc: 'Whisper-powered speech recognition with 99.5% accuracy and speaker identification across 50+ languages.' },
    { icon: Clock,     title: 'Synced Subtitles',       desc: 'Precisely time-stamped subtitles generated automatically. Export as SRT, VTT, or embed directly.' },
    { icon: FileText,  title: 'Smart Summaries',        desc: 'Gemini-driven summaries that distil hours of content into structured, actionable insights.' },
    { icon: Languages, title: 'Topic Analysis',         desc: 'Focus the AI on a specific topic — extract only what matters to your audience.' },
    { icon: Download,  title: 'Flexible Exports',       desc: 'Download transcripts, subtitles, and summaries in any format. SRT · VTT · TXT · PDF.' },
    { icon: Shield,    title: 'Secure & Private',       desc: 'End-to-end processing with no data retention. Your content stays yours.' },
  ];

  const STEPS = [
    {
      icon: FileVideo, num: '01', title: 'Upload your video',
      desc: 'Drop any file — MP4, MOV, AVI. Mimir accepts everything and queues it instantly.',
      placeholder: 'Screenshot: drag-and-drop upload UI with file type icons',
    },
    {
      icon: Zap, num: '02', title: 'AI processes it',
      desc: 'Whisper transcribes the audio while Gemini analyses content, context, and key moments in parallel.',
      placeholder: 'Abstract: waveform + glowing neural-node diagram on dark background',
    },
    {
      icon: Download, num: '03', title: 'Download everything',
      desc: 'Get a full transcript, time-synced subtitles, an AI summary, and optional keyframes — ready to use.',
      placeholder: 'Mockup: results panel showing transcript, SRT, and summary cards side-by-side',
    },
  ];

  return (
    <>
      <GlobalStyles />
      <div className="lp">

        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <nav className={`lp-nav${navSolid ? ' scrolled' : ''}`}>
          <Link to="/landing" className="nav-brand">
            <img src="/logo.png" alt="Mimir" />
            <span className="nav-brand-name">Mimir</span>
          </Link>

          <div className="nav-links" style={{ display: 'flex' }}>
            <a href="#features" className="nav-a">Features</a>
            <a href="#how-it-works" className="nav-a">How it works</a>
            <a href="#contact" className="nav-a">Contact</a>

            {isAuthenticated ? (
              <>
                <Link to="/profile" className="nav-a" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} /> {user?.username}
                </Link>
                <button onClick={logout} className="btn-danger">
                  <LogOut size={13} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-glass">Sign in</Link>
            )}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            className="hamburger"
          >
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 22, height: 1.5, background: 'rgba(201,168,76,0.7)',
                marginBottom: i < 2 ? 5 : 0,
                transition: 'all 0.3s',
                transform: menuOpen && i===0 ? 'rotate(45deg) translate(4.5px,4.5px)' : menuOpen && i===2 ? 'rotate(-45deg) translate(4.5px,-4.5px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </nav>

        {menuOpen && (
          <div className="mobile-menu">
            {['#features','#how-it-works','#contact'].map(h => (
              <a key={h} href={h} className="nav-a" onClick={() => setMenuOpen(false)}>
                {h.replace('#','').replace(/-/g,' ')}
              </a>
            ))}
            {isAuthenticated
              ? <button onClick={logout} className="btn-danger" style={{ alignSelf: 'flex-start' }}><LogOut size={13} /> Logout</button>
              : <Link to="/login" className="btn-teal" style={{ alignSelf: 'flex-start' }}>Sign in</Link>
            }
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        {/*
          BG IMAGE NOTE:
          Replace the hero-bg-image second gradient with:
            url('/images/hero-bg.jpg') center/cover no-repeat
          Recommended image: a dark aerial cityscape or abstract fluid simulation
          at night — deep teal/navy tones, minimal warm light sources.
          The overlay already handles darkening + fade.
        */}
        <section className="hero">
          <div className="hero-bg-image" />
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="hero-mesh" />

          <div className="hero-inner">
            {/* Left */}
            <div>
              <div className="eyebrow">
                <div className="eyebrow-dot" />
                AI-Powered Video Intelligence
              </div>

              <h1 className="hero-h1">
                Every video,<br />
                turned into<br />
                <em className="teal-word">structured knowledge.</em>
              </h1>

              <p className="hero-p">
                Transcription, subtitles, AI summaries, and semantic search —
                all in one quiet, fast pipeline. Upload and walk away with everything.
              </p>

              <div className="hero-btns">
                <Link to="/upload" className="btn-teal">
                  Upload a video <Upload size={15} />
                </Link>
                <a href="#how-it-works" className="btn-outline">
                  How it works <ArrowDown size={15} />
                </a>
              </div>
            </div>

            {/* Right — liquid glass panel */}
            <div className="hero-right">
              <div className="glass-panel">
                <div className="panel-inner">
                  <div className="panel-label">What you get</div>
                  <div className="panel-items">
                    {[
                      { icon: Mic,      label: 'Transcription',  sub: 'Whisper-powered' },
                      { icon: FileText, label: 'AI Summary',     sub: 'Gemini-powered' },
                      { icon: Clock,    label: 'Subtitles',      sub: 'Time-synced SRT' },
                      { icon: Download, label: 'Export',         sub: 'Any format' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="panel-item">
                        <div className="pi-icon"><Icon size={15} color="rgba(201,168,76,0.8)" /></div>
                        <div>
                          <div className="pi-title">{label}</div>
                          <div className="pi-sub">{sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="panel-status">
                    <div className="status-ring">
                      <div className="status-ring-track" />
                      <div className="status-ring-spin" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--teal)', letterSpacing: '0.05em' }}>Ready to process</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 3 }}>Drop a video to get started</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a href="#features" className="scroll-cue">
            <div className="scroll-label">Scroll</div>
            <div className="scroll-line" />
          </a>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <div className="section-bg-alt">
          <section id="features" className="section">
            <SectionHeader
              eye="Capabilities"
              title="Powerful, <em>quiet</em> intelligence"
              sub="Every tool you need to extract maximum value from video — without the noise."
            />
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <FeatCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 70} />
              ))}
            </div>
          </section>
        </div>

        <div className="section-divider" />

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        {/*
          STEP IMAGE NOTES (replace placeholder gradients):
          Step 01 — url('/images/step-upload.jpg')
            Recommended: clean product screenshot of the Mimir upload interface
            on a dark background; slight depth-of-field blur on edges.
          Step 02 — url('/images/step-process.jpg')
            Recommended: abstract dark image of sound waveforms OR a macro
            circuit board with teal-tinted lighting. Atmospheric, not literal.
          Step 03 — url('/images/step-results.jpg')
            Recommended: product screenshot of the results panel showing
            transcript + subtitle cards laid out side-by-side.
        */}
        <div className="section-bg-mid">
          <section id="how-it-works" className="section">
            <SectionHeader
              eye="Process"
              title="Three steps to <em>clarity</em>"
              sub="From raw video to structured knowledge in minutes."
            />
            <div className="steps-grid">
              {STEPS.map((s, i) => (
                <StepCard key={s.num} icon={s.icon} num={s.num} title={s.title}
                  desc={s.desc} placeholder={s.placeholder} delay={i * 100} />
              ))}
            </div>
          </section>
        </div>

        <div className="section-divider" />

        {/* ── CONTACT ─────────────────────────────────────────────────────── */}
        <div className="section-bg-alt">
          <section id="contact" className="section">
            <SectionHeader
              eye="Contact"
              title="Get in <em>touch</em>"
              sub="We'd love to hear from you."
              center
            />
            <div className="contact-grid">
              {[
                { icon: Mail,   title: 'Email',  value: 'support@mimir.ai',    delay: 0 },
                { icon: Phone,  title: 'Phone',  value: '+1 (555) 123-4567',   delay: 90 },
                { icon: MapPin, title: 'Office', value: 'San Francisco, CA',   delay: 180 },
              ].map(c => <ContactCard key={c.title} {...c} />)}
            </div>
          </section>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer className="lp-footer">
          <div className="footer-inner">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <img src="/logo.png" alt="Mimir" style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.3)' }} />
                <span className="footer-brand-name">Mimir</span>
              </div>
              <p className="footer-p">
                Transforming video content with AI-powered intelligence. Extract every insight, automatically.
              </p>
            </div>

            <div>
              <div className="footer-col-label">Navigation</div>
              {['#features','#how-it-works','#contact'].map(h => (
                <a key={h} href={h} className="footer-link">
                  {h.replace('#','').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                </a>
              ))}
            </div>

            <div>
              <div className="footer-col-label">Platform</div>
              <Link to="/upload" className="footer-link">Upload</Link>
              <Link to="/search" className="footer-link">Search</Link>
              <Link to="/profile" className="footer-link">Profile</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Mimir. All rights reserved.</div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;