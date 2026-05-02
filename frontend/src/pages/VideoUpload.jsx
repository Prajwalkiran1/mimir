import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, FileVideo, Clock, FileText, Download, Settings,
  CheckCircle, AlertCircle, RotateCcw, X, ChevronRight,
  Brain, Languages, Image, Search, Play, Zap
} from 'lucide-react';
import { apiService, API_BASE_URL } from '../services/api';

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
      --gold:         #c9a84c;
      --white:        #f0faf8;
      --text:         rgba(220, 248, 242, 0.82);
      --text-dim:     rgba(180, 230, 220, 0.5);
      --font-serif:   'DM Serif Display', Georgia, serif;
      --font-sans:    'DM Sans', sans-serif;
      --font-brand:   'Cinzel Decorative', cursive;
      --radius-lg:    20px;
      --radius-xl:    28px;
    }

    .up-wrap {
      font-family: var(--font-sans);
      background: var(--bg);
      min-height: 100vh;
      color: var(--white);
      position: relative;
      overflow-x: hidden;
    }

    /* Mesh background */
    .up-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(100,210,200,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,210,200,0.022) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 10%, transparent 80%);
    }

    /* Orbs */
    .up-orb {
      position: fixed; border-radius: 50%; pointer-events: none;
      filter: blur(80px); z-index: 0;
    }
    .up-orb-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(100,210,200,0.07) 0%, transparent 70%);
      top: -100px; right: 0%;
      animation: orbDrift 14s ease-in-out infinite;
    }
    .up-orb-2 {
      width: 380px; height: 380px;
      background: radial-gradient(circle, rgba(80,160,150,0.06) 0%, transparent 70%);
      bottom: 5%; left: -80px;
      animation: orbDrift 18s ease-in-out infinite reverse;
    }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(14px,-20px) scale(1.03); }
      66% { transform: translate(-10px,10px) scale(0.97); }
    }

    /* ── Nav ── */
    .up-nav {
      position: sticky; top: 0; z-index: 100;
      height: 66px; display: flex; align-items: center;
      padding: 0 clamp(20px, 5vw, 72px);
      justify-content: space-between;
      background: rgba(10, 26, 26, 0.72);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border-bottom: 1px solid var(--glass-border);
    }

    .up-nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .up-nav-brand img { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(100,210,200,0.3); }
    .up-nav-brand-name { font-family: var(--font-brand); font-size: 1.2rem; color: var(--teal); letter-spacing: 0.02em; }

    .up-nav-links { display: flex; align-items: center; gap: 2rem; }
    .up-nav-a {
      font-size: 0.82rem; font-weight: 500; letter-spacing: 0.04em;
      color: var(--text); text-decoration: none; transition: color 0.25s;
    }
    .up-nav-a:hover { color: var(--teal); }

    /* ── Page body ── */
    .up-page {
      position: relative; z-index: 1;
      max-width: 960px; margin: 0 auto;
      padding: clamp(48px,7vw,96px) clamp(20px,5vw,48px) 80px;
    }

    /* ── Page header ── */
    .up-header {
      text-align: center; margin-bottom: 52px;
      animation: riseIn 0.8s cubic-bezier(0.23,1,0.32,1) 0.1s both;
    }

    .up-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 5px 14px 5px 8px; border-radius: 100px;
      background: rgba(100,210,200,0.08);
      border: 1px solid rgba(100,210,200,0.2);
      font-size: 0.7rem; font-weight: 500; letter-spacing: 0.1em;
      color: var(--teal); text-transform: uppercase; margin-bottom: 22px;
    }
    .up-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); }

    .up-h1 {
      font-family: var(--font-serif); font-size: clamp(2.4rem, 5vw, 3.8rem);
      font-weight: 400; line-height: 1.08; color: var(--white);
      margin-bottom: 18px; letter-spacing: -0.01em;
    }
    .up-h1 em { font-style: italic; color: var(--teal); }

    .up-sub {
      font-size: 0.98rem; color: var(--text); font-weight: 300;
      line-height: 1.75; max-width: 420px; margin: 0 auto;
    }

    @keyframes riseIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Glass card ── */
    .glass-card {
      background: var(--glass-bg);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 20px 56px rgba(0,0,0,0.4);
      position: relative; overflow: hidden;
    }
    .glass-card::before {
      content: '';
      position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.3), transparent);
      pointer-events: none;
    }

    /* ── Upload zone ── */
    .up-zone {
      border: 1.5px dashed rgba(100,210,200,0.25);
      border-radius: var(--radius-xl);
      padding: 56px 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
      background: var(--glass-bg);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      position: relative; overflow: hidden;
      animation: riseIn 0.8s cubic-bezier(0.23,1,0.32,1) 0.25s both;
    }
    .up-zone::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(100,210,200,0.04), transparent 70%);
      pointer-events: none;
    }
    .up-zone:hover, .up-zone.dragging {
      border-color: rgba(100,210,200,0.5);
      box-shadow: 0 0 0 1px rgba(100,210,200,0.1), 0 24px 60px rgba(0,0,0,0.45);
      transform: translateY(-3px);
    }

    .up-zone-icon {
      width: 72px; height: 72px; border-radius: 20px;
      background: rgba(100,210,200,0.09);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      transition: all 0.3s;
    }
    .up-zone:hover .up-zone-icon, .up-zone.dragging .up-zone-icon {
      background: rgba(100,210,200,0.16);
      border-color: rgba(100,210,200,0.4);
    }

    .up-zone-title {
      font-family: var(--font-serif); font-size: 1.65rem;
      color: var(--white); margin-bottom: 8px;
    }
    .up-zone-sub {
      font-size: 0.88rem; color: var(--text-dim); margin-bottom: 28px;
      font-weight: 300;
    }

    /* Buttons */
    .btn-teal {
      font-family: var(--font-sans); font-size: 0.84rem; font-weight: 500;
      padding: 11px 28px; border-radius: 100px;
      background: linear-gradient(135deg, rgba(100,210,200,0.9) 0%, rgba(80,190,175,0.9) 100%);
      border: 1px solid rgba(160,240,220,0.3);
      color: #061414; cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 8px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(100,210,200,0.2);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-teal:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 32px rgba(100,210,200,0.3); }

    .btn-glass {
      font-family: var(--font-sans); font-size: 0.84rem; font-weight: 500;
      padding: 10px 24px; border-radius: 100px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--white); cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; gap: 8px;
      backdrop-filter: blur(16px);
      box-shadow: inset 0 1px 0 var(--glass-shine);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .btn-glass:hover { border-color: rgba(100,210,200,0.4); transform: translateY(-1px); }

    .btn-danger-sm {
      font-family: var(--font-sans); font-size: 0.78rem; font-weight: 500;
      padding: 6px 14px; border-radius: 100px;
      background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25);
      color: #fca5a5; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: all 0.2s;
    }
    .btn-danger-sm:hover { background: rgba(220,38,38,0.18); border-color: rgba(220,38,38,0.5); }

    /* ── File pill ── */
    .file-pill {
      display: flex; align-items: center; gap: 14px;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 28px;
      animation: riseIn 0.5s cubic-bezier(0.23,1,0.32,1) both;
    }
    .file-pill-icon {
      width: 42px; height: 42px; border-radius: 10px;
      background: rgba(100,210,200,0.1);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .file-pill-name {
      font-size: 0.9rem; font-weight: 500; color: var(--white);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-pill-size { font-size: 0.75rem; color: var(--text-dim); margin-top: 3px; }
    .file-pill-close {
      margin-left: auto; width: 30px; height: 30px; border-radius: 8px;
      background: transparent; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-dim); transition: all 0.2s; flex-shrink: 0;
    }
    .file-pill-close:hover { background: rgba(220,38,38,0.12); color: #fca5a5; }

    /* ── Options ── */
    .options-section { margin-bottom: 28px; animation: riseIn 0.6s cubic-bezier(0.23,1,0.32,1) 0.1s both; }

    .options-label {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 14px;
    }

    .options-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px;
    }

    .option-card {
      position: relative;
      background: rgba(10, 30, 28, 0.5);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
      user-select: none; overflow: hidden;
    }
    .option-card::before {
      content: '';
      position: absolute; top: 0; left: 0;
      width: 3px; height: 100%;
      background: var(--teal);
      transform: scaleY(0);
      transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
      border-radius: 0 2px 2px 0;
    }
    .option-card:hover { border-color: rgba(100,210,200,0.3); transform: translateY(-2px); }
    .option-card.active {
      border-color: rgba(100,210,200,0.35);
      background: rgba(100,210,200,0.06);
    }
    .option-card.active::before { transform: scaleY(1); }

    .option-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
    .option-card-left { display: flex; align-items: center; gap: 10px; }

    .option-icon {
      width: 30px; height: 30px; border-radius: 8px;
      background: rgba(100,210,200,0.08);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .option-card.active .option-icon { background: rgba(100,210,200,0.15); }

    .option-name { font-size: 0.88rem; font-weight: 500; color: var(--white); }

    .option-toggle {
      width: 34px; height: 18px; border-radius: 9px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      position: relative; transition: all 0.25s; flex-shrink: 0;
    }
    .option-toggle::after {
      content: '';
      position: absolute; left: 2px; top: 50%;
      transform: translateY(-50%);
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--text-dim);
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .option-card.active .option-toggle { background: var(--teal); border-color: var(--teal); }
    .option-card.active .option-toggle::after { left: calc(100% - 14px); background: #061414; }

    .option-desc { font-size: 0.76rem; color: var(--text-dim); line-height: 1.5; padding-left: 40px; }

    /* ── Results: hero video + full-width section stack ── */
    .results-hero {
      margin-bottom: 22px;
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: var(--glass-bg);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 24px 64px rgba(0,0,0,0.45);
      animation: riseIn 0.55s cubic-bezier(0.23,1,0.32,1) both;
      position: relative;
    }
    .results-hero::before {
      content: '';
      position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.32), transparent);
      pointer-events: none; z-index: 1;
    }
    .results-hero-video {
      width: 100%; aspect-ratio: 16 / 9; background: #000;
      display: block; outline: none;
    }

    .results-stack {
      display: flex; flex-direction: column; gap: 18px;
      margin-bottom: 28px;
    }

    .result-section {
      background: var(--glass-bg);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: 26px 30px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 16px 40px rgba(0,0,0,0.32);
      animation: riseIn 0.55s cubic-bezier(0.23,1,0.32,1) both;
    }
    .result-section::before {
      content: '';
      position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.22), transparent);
      pointer-events: none;
    }

    .rs-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 18px; gap: 16px; flex-wrap: wrap;
    }
    .rs-head-left { display: flex; align-items: center; gap: 12px; }
    .rs-head-icon {
      width: 36px; height: 36px; border-radius: 11px;
      background: rgba(100,210,200,0.08);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rs-head-text { display: flex; flex-direction: column; gap: 2px; }
    .rs-title {
      font-family: var(--font-serif); font-size: 1.35rem;
      color: var(--white); line-height: 1.15; letter-spacing: -0.005em;
      font-weight: 400;
    }
    .rs-subtitle {
      font-size: 0.78rem; color: var(--text-dim); font-weight: 300;
    }
    .rs-tools {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }

    .rs-body p {
      font-size: 0.95rem; color: var(--text); line-height: 1.78;
      font-weight: 300;
    }
    .rs-body pre {
      font-family: 'Menlo', 'Consolas', monospace; font-size: 0.83rem;
      color: var(--text); white-space: pre-wrap; word-wrap: break-word;
      line-height: 1.7; max-height: 380px; overflow-y: auto;
      padding-right: 6px;
    }

    /* Topic section — gold-accented to differentiate */
    .topic-section { border-color: rgba(201, 168, 76, 0.22); }
    .topic-section::before {
      background: linear-gradient(90deg, transparent, rgba(232, 200, 110, 0.32), transparent);
    }
    .topic-section .rs-head-icon {
      background: rgba(201, 168, 76, 0.08);
      border-color: rgba(201, 168, 76, 0.25);
    }

    /* Key points list — bigger, breathy spacing */
    .key-points-list {
      margin-top: 22px;
      padding-top: 20px;
      border-top: 1px solid rgba(100, 210, 200, 0.1);
      display: flex; flex-direction: column; gap: 12px;
    }
    .key-points-eyebrow {
      font-size: 0.62rem; font-weight: 500; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--teal-dim);
      margin-bottom: 8px;
    }
    .topic-section .key-points-eyebrow { color: rgba(201, 168, 76, 0.7); }
    .topic-section .key-points-list { border-top-color: rgba(201, 168, 76, 0.12); }
    .topic-section .key-bullet { background: rgba(201, 168, 76, 0.7); }

    /* Bigger keyframe thumbnails */
    .kf-strip {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    .kf-cell-btn {
      position: relative; border-radius: 14px; overflow: hidden;
      border: 1px solid var(--glass-border);
      background: rgba(0, 0, 0, 0.5);
      aspect-ratio: 16 / 9;
      cursor: pointer; padding: 0; outline: none;
      transition: all 0.28s cubic-bezier(0.23, 1, 0.32, 1);
      font-family: inherit;
    }
    .kf-cell-btn:hover {
      transform: translateY(-3px) scale(1.025);
      border-color: rgba(100, 210, 200, 0.5);
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
    }
    .kf-cell-btn img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      transition: transform 0.5s ease;
    }
    .kf-cell-btn:hover img { transform: scale(1.06); }
    .kf-cell-overlay {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 22px 12px 10px;
      background: linear-gradient(180deg, transparent, rgba(6, 18, 18, 0.92));
      display: flex; align-items: center; justify-content: space-between;
      pointer-events: none;
    }
    .kf-cell-time {
      font-family: 'Menlo', 'Consolas', monospace; font-size: 0.78rem;
      color: var(--white); font-weight: 500;
    }
    .kf-cell-jump {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.62rem; font-weight: 600; letter-spacing: 0.16em;
      color: var(--teal); text-transform: uppercase;
      opacity: 0; transition: opacity 0.2s;
    }
    .kf-cell-btn:hover .kf-cell-jump { opacity: 1; }

    /* Collapsible "raw subtitles" footer */
    .collapsible-section {
      background: rgba(5, 18, 18, 0.45);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      animation: riseIn 0.55s cubic-bezier(0.23,1,0.32,1) both;
    }
    .collapsible-toggle {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; background: none; border: none; cursor: pointer;
      font-family: var(--font-sans); font-size: 0.84rem; color: var(--text);
      font-weight: 400; padding: 14px 18px;
    }
    .collapsible-toggle:hover { color: var(--teal); }
    .collapsible-content {
      padding: 0 18px 16px;
      border-top: 1px solid var(--glass-border);
      padding-top: 14px;
    }
    .collapsible-content pre {
      font-family: 'Menlo', 'Consolas', monospace; font-size: 0.78rem;
      color: var(--text); white-space: pre-wrap; word-wrap: break-word;
      max-height: 280px; overflow-y: auto; line-height: 1.65;
      margin: 0;
    }

    /* ── Customize panel ── */
    .customize-section {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 18px 22px;
      margin-bottom: 16px;
      animation: riseIn 0.45s cubic-bezier(0.23,1,0.32,1) both;
    }
    .customize-eyebrow {
      font-size: 0.6rem; font-weight: 500; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--teal-dim);
      margin-bottom: 14px; display: inline-flex; align-items: center; gap: 8px;
    }
    .customize-eyebrow::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%;
      background: var(--teal-dim);
    }
    .customize-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 14px; padding: 10px 0;
      border-bottom: 1px solid rgba(100,210,200,0.06);
    }
    .customize-row:last-child { border-bottom: none; padding-bottom: 0; }
    .customize-row:first-of-type { padding-top: 0; }
    .customize-label {
      font-size: 0.83rem; color: var(--text); font-weight: 400;
      display: flex; flex-direction: column; gap: 3px;
    }
    .customize-label-hint {
      font-size: 0.72rem; color: var(--text-dim); font-weight: 300;
    }

    /* Segmented control */
    .seg-toggle {
      display: inline-flex; padding: 3px;
      background: rgba(5, 18, 18, 0.55);
      border: 1px solid var(--glass-border);
      border-radius: 100px; gap: 2px;
    }
    .seg-btn {
      font-family: var(--font-sans); font-size: 0.78rem; font-weight: 500;
      padding: 6px 16px; border-radius: 100px; border: none;
      background: transparent; color: var(--text-dim);
      cursor: pointer; transition: all 0.22s ease;
      letter-spacing: 0.02em;
    }
    .seg-btn:hover { color: var(--text); }
    .seg-btn.active {
      background: linear-gradient(135deg, rgba(100,210,200,0.85) 0%, rgba(80,190,175,0.85) 100%);
      color: #061414; box-shadow: 0 2px 10px rgba(100,210,200,0.18);
    }

    /* ── Video player (subtitles result) ── */
    .video-player-wrap {
      position: relative; width: 100%; border-radius: 12px; overflow: hidden;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid var(--glass-border);
      aspect-ratio: 16 / 9;
    }
    .video-player-wrap video {
      width: 100%; height: 100%; display: block; outline: none;
      background: #000;
    }
    .video-player-fallback {
      padding: 20px; color: var(--text-dim); font-size: 0.84rem;
      text-align: center; font-weight: 300;
    }
    .video-toggle-srt {
      margin-top: 12px;
      font-size: 0.74rem; color: var(--teal-dim); cursor: pointer;
      background: none; border: none; font-family: var(--font-sans);
      padding: 4px 0; transition: color 0.2s; display: inline-flex; gap: 4px; align-items: center;
    }
    .video-toggle-srt:hover { color: var(--teal); }
    .srt-raw {
      margin-top: 10px; max-height: 220px; overflow-y: auto;
      background: rgba(5, 18, 18, 0.55);
      border: 1px solid var(--glass-border);
      border-radius: 10px; padding: 14px;
    }
    .srt-raw pre {
      font-family: 'Menlo', 'Consolas', monospace; font-size: 0.78rem;
      color: var(--text); white-space: pre-wrap; word-wrap: break-word; line-height: 1.6;
    }

    /* ── Keyframe grid ── */
    .kf-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
    }
    .kf-cell {
      position: relative; border-radius: 10px; overflow: hidden;
      border: 1px solid var(--glass-border);
      background: rgba(0, 0, 0, 0.5);
      aspect-ratio: 16 / 9;
      cursor: pointer; text-decoration: none;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .kf-cell:hover {
      transform: scale(1.04);
      border-color: rgba(100,210,200,0.45);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    }
    .kf-cell img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      transition: transform 0.4s ease;
    }
    .kf-cell:hover img { transform: scale(1.06); }
    .kf-time {
      position: absolute; bottom: 6px; left: 6px;
      background: rgba(6, 20, 20, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid var(--glass-border);
      color: var(--teal); font-family: 'Menlo', 'Consolas', monospace;
      font-size: 0.68rem; font-weight: 500;
      padding: 2px 7px; border-radius: 100px;
    }
    .kf-empty {
      padding: 32px 16px; text-align: center;
      color: var(--text-dim); font-style: italic; font-size: 0.86rem; font-weight: 300;
    }

    /* ── Topic field ── */
    .topic-wrap {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 24px;
      animation: riseIn 0.5s cubic-bezier(0.23,1,0.32,1) both;
    }
    .topic-label {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--teal-dim); white-space: nowrap; flex-shrink: 0;
    }
    .topic-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.9rem; caret-color: var(--teal);
    }
    .topic-input::placeholder { color: var(--text-dim); }

    /* ── Error bar ── */
    .error-bar {
      background: rgba(220,38,38,0.07);
      border: 1px solid rgba(220,38,38,0.22);
      border-radius: 12px;
      padding: 12px 18px;
      display: flex; align-items: center; gap: 10px;
      color: #fca5a5; font-size: 0.88rem;
      margin-bottom: 20px;
      animation: riseIn 0.4s ease both;
    }

    .actions { display: flex; justify-content: center; margin-top: 8px; }

    /* ── Processing ── */
    .phase-card {
      background: var(--glass-bg);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-xl);
      padding: 28px 32px;
      margin-bottom: 20px;
      box-shadow: inset 0 1px 0 var(--glass-shine);
      animation: riseIn 0.6s cubic-bezier(0.23,1,0.32,1) both;
    }

    .phase-card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; padding-bottom: 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .phase-filename {
      font-size: 0.92rem; font-weight: 500; color: var(--white);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 380px;
    }
    .phase-hint { font-size: 0.74rem; color: var(--text-dim); margin-top: 3px; font-weight: 300; }

    .live-pill {
      display: flex; align-items: center; gap: 6px;
      background: rgba(100,210,200,0.07);
      border: 1px solid rgba(100,210,200,0.2);
      border-radius: 100px; padding: 4px 12px; flex-shrink: 0;
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
      animation: pulseDot 1.4s ease-in-out infinite;
    }
    @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
    .live-label {
      font-size: 0.62rem; font-weight: 500; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--teal-dim);
    }

    .phases-list { display: flex; flex-direction: column; gap: 14px; }

    .phase-row { display: flex; align-items: flex-start; gap: 14px; transition: opacity 0.5s ease; }
    .phase-row.dim { opacity: 0.25; }

    .phase-status { width: 24px; height: 24px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }

    .status-done {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.4);
      display: flex; align-items: center; justify-content: center;
    }
    .status-spin {
      width: 22px; height: 22px; border-radius: 50%;
      border: 1.5px solid var(--glass-border);
      border-top-color: var(--teal);
      animation: spinAnim 0.75s linear infinite;
    }
    @keyframes spinAnim { to { transform: rotate(360deg); } }
    .status-idle {
      width: 22px; height: 22px; border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.1);
    }

    .phase-text { flex: 1; }
    .phase-name { font-size: 0.88rem; font-weight: 500; letter-spacing: 0.02em; line-height: 1.3; }
    .phase-name.done { color: #86efac; }
    .phase-name.active { color: var(--white); }
    .phase-name.idle { color: var(--text-dim); }

    .phase-msg {
      font-size: 0.75rem; color: var(--teal-dim); font-style: italic;
      margin-top: 3px;
      animation: fadeUp 0.4s ease both;
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

    /* ── Skeleton ── */
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

    .skeleton-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg); padding: 20px; overflow: hidden;
    }
    .skel {
      background: linear-gradient(90deg, rgba(100,210,200,0.06) 25%, rgba(100,210,200,0.12) 50%, rgba(100,210,200,0.06) 75%);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer { to { background-position: -200% center; } }

    /* ── Results ── */
    .success-bar {
      display: flex; align-items: center; gap: 14px;
      background: rgba(34,197,94,0.05);
      border: 1px solid rgba(34,197,94,0.18);
      border-radius: 14px; padding: 14px 20px; margin-bottom: 24px;
      animation: riseIn 0.5s cubic-bezier(0.23,1,0.32,1) both;
    }
    .success-icon {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .success-title { font-size: 0.92rem; font-weight: 500; color: #86efac; }
    .success-sub { font-size: 0.78rem; color: rgba(134,239,172,0.65); margin-top: 2px; }

    .results-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 14px; margin-bottom: 28px;
    }

    .result-card {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg); padding: 20px;
      transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative; overflow: hidden;
      animation: riseIn 0.6s cubic-bezier(0.23,1,0.32,1) both;
    }
    .result-card::before {
      content: '';
      position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(100,210,200,0.22), transparent);
    }
    .result-card:hover { border-color: rgba(100,210,200,0.3); transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }

    .result-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .result-title {
      display: flex; align-items: center; gap: 8px;
      font-family: var(--font-serif); font-size: 1rem; color: var(--white);
    }
    .result-dl {
      width: 32px; height: 32px; border-radius: 9px;
      background: rgba(100,210,200,0.08);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--teal); transition: all 0.2s;
    }
    .result-dl:hover { background: rgba(100,210,200,0.16); border-color: rgba(100,210,200,0.4); }

    .result-body {
      background: rgba(5, 18, 18, 0.55);
      border: 1px solid rgba(100,210,200,0.08);
      border-radius: 10px; padding: 14px;
      max-height: 200px; overflow-y: auto;
    }
    .result-body::-webkit-scrollbar { width: 4px; }
    .result-body::-webkit-scrollbar-track { background: transparent; }
    .result-body::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 2px; }

    .result-body pre {
      font-family: 'Fira Mono', monospace; font-size: 0.76rem;
      color: var(--text); white-space: pre-wrap; line-height: 1.65;
    }
    .result-body p { font-size: 0.84rem; color: var(--text); line-height: 1.7; font-weight: 300; }

    .badge {
      font-size: 0.6rem; font-weight: 500; letter-spacing: 0.12em;
      text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
    }
    .badge-teal { background: rgba(100,210,200,0.1); color: var(--teal); border: 1px solid rgba(100,210,200,0.2); }
    .badge-dim { background: rgba(180,230,220,0.06); color: var(--text-dim); border: 1px solid var(--glass-border); }

    .keyframe-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
    .keyframe-ts {
      font-family: 'Fira Mono', monospace; font-size: 0.7rem;
      background: rgba(100,210,200,0.08); color: var(--teal);
      padding: 2px 8px; border-radius: 4px; flex-shrink: 0;
      border: 1px solid rgba(100,210,200,0.15);
    }

    .key-point {
      display: flex; align-items: flex-start; gap: 8px;
      margin-top: 10px; padding-top: 10px;
      border-top: 1px solid rgba(100,210,200,0.07);
      font-size: 0.82rem; color: var(--text); line-height: 1.55;
    }
    .key-bullet { width: 5px; height: 5px; background: var(--teal); border-radius: 50%; margin-top: 6px; flex-shrink: 0; }

    .results-actions {
      display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;
      animation: riseIn 0.6s cubic-bezier(0.23,1,0.32,1) 0.3s both;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: rgba(100,210,200,0.22); border-radius: 3px; }
  `}</style>
);

/* ─── Phase definitions ──────────────────────────────────────────────────────── */
const getPhases = (options) => {
  const p = [{ id: 'init', label: 'Initialising pipeline', keywords: ['initializ', 'starting'] }];
  if (options.transcript) p.push({ id: 'transcription', label: 'Transcribing audio', keywords: ['transcrib', 'audio', 'speech', 'whisper', 'analyzing audio', 'loading transcription', 'processing speech', 'formatting transcription'] });
  if (options.keyframes) p.push({ id: 'keyframes', label: 'Extracting keyframes', keywords: ['keyframe', 'frame', 'visual', 'cluster'] });
  if (options.summary || options.topicBased) p.push({ id: 'summary', label: 'Generating summary', keywords: ['summar', 'gemini', 'topic', 'ai summary', 'generating ai', 'summary complete', 'generating summary'] });
  if (options.subtitles) p.push({ id: 'subtitles', label: 'Generating subtitles', keywords: ['subtitle', 'srt', 'caption', 'sync'] });
  return p;
};

const PHASE_MESSAGES = {
  init: ['Warming up the engines…', 'Getting everything ready…', 'Firing up the pipeline…'],
  transcription: ['Listening to every word…', 'Whispering with Whisper…', 'Decoding the audio waves…', 'Converting speech to knowledge…'],
  keyframes: ['Picking the perfect moments…', 'Clustering the visual story…', 'Finding frames that matter…'],
  summary: ['Reading between the lines…', 'Asking Gemini nicely…', 'Distilling the essence…', 'Crafting the summary…'],
  rag: ['Building the knowledge graph…', 'Weaving the semantic web…', 'Thinking in vectors…'],
  subtitles: ['Syncing words to timestamps…', 'Writing the captions…', 'Timestamping every syllable…'],
  default: ['Working hard…', 'Almost there…', 'The gears are turning…'],
};

const OPTION_META = [
  { key: 'subtitles',  icon: Clock,     label: 'Subtitles',      desc: 'Time-synced captions for the player' },
  { key: 'transcript', icon: FileText,  label: 'Transcript',     desc: 'Full text transcription' },
  { key: 'summary',    icon: Brain,     label: 'AI Summary',     desc: 'Concise overview powered by Gemini' },
  { key: 'keyframes',  icon: Image,     label: 'Keyframes',      desc: 'Click to jump to the moment' },
  { key: 'topicBased', icon: Languages, label: 'Topic Analysis', desc: 'Focus the summary on a specific topic' },
];

/* ── Skeleton ── */
const SkeletonCard = ({ lines = 6 }) => (
  <div className="skeleton-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div className="skel" style={{ width: 26, height: 26, borderRadius: 8 }} />
      <div className="skel" style={{ width: 110, height: 13 }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 10, width: i % 3 === 2 ? '65%' : i % 3 === 1 ? '82%' : '100%' }} />
      ))}
    </div>
  </div>
);

/* ─── Main ──────────────────────────────────────────────────────────────────── */
const VideoUpload = () => {
  const [videoFile, setVideoFile]           = useState(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [results, setResults]               = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    subtitles: true, transcript: true, summary: true,
    keyframes: false, topicBased: false,
  });
  const [selectedTopic, setSelectedTopic]   = useState('');
  const [summaryLength, setSummaryLength]   = useState('medium'); // short | medium | long
  const [subtitleFormat, setSubtitleFormat] = useState('srt');    // srt | vtt
  const [error, setError]                   = useState(null);

  const [phaseMessageIdx, setPhaseMessageIdx]     = useState(0);
  const [currentPhaseId, setCurrentPhaseId]       = useState('init');
  const [completedPhaseIds, setCompletedPhaseIds] = useState([]);
  const [showRawSrt, setShowRawSrt]               = useState(false);
  const videoRef = useRef(null);

  const seekToTimestamp = (ts) => {
    const el = videoRef.current;
    if (!el || typeof ts !== 'number') return;
    el.currentTime = Math.max(0, ts);
    el.play().catch(() => {});
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!isProcessing) { setPhaseMessageIdx(0); setCurrentPhaseId('init'); setCompletedPhaseIds([]); return; }
    const t = setInterval(() => setPhaseMessageIdx(i => i + 1), 4000);
    return () => clearInterval(t);
  }, [isProcessing]);

  useEffect(() => {
    if (!processingStep || !isProcessing) return;
    const step = processingStep.toLowerCase();
    const phases = getPhases(selectedOptions);
    for (let i = 0; i < phases.length; i++) {
      if (phases[i].keywords.some(k => step.includes(k))) {
        if (phases[i].id !== currentPhaseId) {
          setCurrentPhaseId(phases[i].id);
          setCompletedPhaseIds(phases.slice(0, i).map(p => p.id));
          setPhaseMessageIdx(0);
        }
        return;
      }
    }
  }, [processingStep]); // eslint-disable-line

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith('video/')) { setVideoFile(file); setResults(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('video/')) { setVideoFile(file); setResults(null); }
  };

  const toggleOption = (key) => setSelectedOptions(prev => ({ ...prev, [key]: !prev[key] }));

  const handleProcess = async () => {
    if (!videoFile) return;
    setIsProcessing(true); setResults(null); setError(null);
    setCurrentPhaseId('init'); setCompletedPhaseIds([]); setPhaseMessageIdx(0);
    try {
      const options = {
        transcript: selectedOptions.transcript, summary: selectedOptions.summary,
        subtitles: selectedOptions.subtitles, keyframes: selectedOptions.keyframes,
        rag: false, topic_based: selectedOptions.topicBased,
        topic: selectedOptions.topicBased ? selectedTopic : null,
        download_format: subtitleFormat, summary_length: summaryLength, use_gpu: true,
      };
      const response = await apiService.uploadVideo(videoFile, options);
      apiService.pollStatus(response.task_id, (status) => {
        setProcessingStep(status.current_step || '');
        if (status.status === 'completed') {
          const rawSummary = status.results?.summary;
          setResults({
            transcript: status.results?.transcript?.segments
              ? status.results.transcript.segments.map(s => s.text).join(' ')
              : status.results?.transcript || 'No transcript available',
            summary: {
              text: rawSummary?.summary || (typeof rawSummary === 'string' ? rawSummary : 'No summary available'),
              key_points: rawSummary?.key_points || [],
              summary_type: rawSummary?.summary_type || 'extractive',
              topic: rawSummary?.topic, method: rawSummary?.method,
              summary_length: rawSummary?.summary_length,
            },
            subtitles: status.results?.subtitles?.subtitles || status.results?.subtitles || 'No subtitles available',
            keyframes: status.results?.keyframes?.keyframes
              ? status.results.keyframes.keyframes.map(kf => ({ ...kf, path: kf.frame_path || kf.path || 'unknown' }))
              : [],
            topic_analysis: status.results?.topic_analysis || null,
            video_url: status.results?.video_url || null,
            subtitles_vtt_url: status.results?.subtitles_vtt_url || null,
            task_id: status.results?.task_id || response.task_id,
          });
          setIsProcessing(false);
        } else if (status.status === 'failed' || status.status === 'error') {
          setError(status.error || 'Processing failed');
          setIsProcessing(false);
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to start processing');
      setIsProcessing(false);
    }
  };

  const handleDownload = (type) => {
    let content = '', filename = '';
    switch (type) {
      case 'transcript': content = typeof results.transcript === 'string' ? results.transcript : ''; filename = `transcript_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
      case 'subtitles': content = typeof results.subtitles === 'string' ? results.subtitles : ''; filename = `subtitles_${videoFile.name.replace(/\.[^/.]+$/, '')}.${subtitleFormat}`; break;
      case 'summary':
        content = results.summary?.text || '';
        if (results.summary?.key_points?.length) content += '\n\nKey Points:\n' + results.summary.key_points.map(p => `• ${p}`).join('\n');
        filename = `summary_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
      case 'keyframes':
        content = (Array.isArray(results.keyframes) ? results.keyframes : []).map(kf => `${kf.timestamp || kf.time}: ${kf.description || 'Keyframe'}`).join('\n');
        filename = `keyframes_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
      case 'topic':
        const ta = results.topic_analysis || {};
        content = `Topic: ${ta.topic || ''}\n\n${ta.summary || ''}`;
        if (ta.key_points?.length) content += '\n\nKey mentions:\n' + ta.key_points.map(p => `• ${p}`).join('\n');
        filename = `topic_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`;
        break;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setVideoFile(null); setResults(null); setIsProcessing(false); setError(null);
    setSelectedTopic(''); setSummaryLength('medium'); setSubtitleFormat('srt');
    setSelectedOptions({ subtitles: true, transcript: true, summary: true, keyframes: false, topicBased: false });
  };

  const activePhases = getPhases(selectedOptions);

  return (
    <div className="up-wrap">
      <PageStyles />

      {/* Background atmosphere */}
      <div className="up-mesh" />
      <div className="up-orb up-orb-1" />
      <div className="up-orb up-orb-2" />

      {/* ── Nav ── */}
      <nav className="up-nav">
        <Link to="/landing" className="up-nav-brand">
          <img src="/logo.png" alt="Mimir" />
          <span className="up-nav-brand-name">Mimir</span>
        </Link>
        <div className="up-nav-links">
          <Link to="/profile" className="up-nav-a">Profile</Link>
          <Link to="/landing" className="up-nav-a">Home</Link>
        </div>
      </nav>

      <div className="up-page">

        {/* ── Page header ── */}
        <div className="up-header">
          <div className="up-eyebrow">
            <div className="up-eyebrow-dot" />
            Video Processing Studio
          </div>
          <h1 className="up-h1">
            Turn video into<br /><em>structured knowledge.</em>
          </h1>
          <p className="up-sub">
            Upload your video, choose your outputs, and let Mimir do the rest.
          </p>
        </div>

        {/* ── Upload zone ── */}
        {!videoFile && (
          <div
            className={`up-zone${isDragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="up-zone-icon">
              <Upload size={26} color={isDragging ? '#64d2c8' : 'rgba(100,210,200,0.65)'} />
            </div>
            <h3 className="up-zone-title">{isDragging ? 'Drop it here' : 'Drop your video'}</h3>
            <p className="up-zone-sub">MP4 · MKV · MOV · AVI — drag and drop or click to browse</p>
            <input type="file" accept="video/*" onChange={handleFileUpload} id="video-upload" style={{ display: 'none' }} />
            <label htmlFor="video-upload">
              <span className="btn-teal" style={{ cursor: 'pointer' }}>
                <FileVideo size={15} />
                Choose file
              </span>
            </label>
          </div>
        )}

        {/* ── File selected ── */}
        {videoFile && !results && (
          <>
            {!isProcessing && (
              <div>
                {/* File pill */}
                <div className="file-pill">
                  <div className="file-pill-icon">
                    <FileVideo size={18} color="rgba(100,210,200,0.8)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-pill-name">{videoFile.name}</div>
                    <div className="file-pill-size">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button onClick={resetUpload} className="file-pill-close">
                    <X size={15} />
                  </button>
                </div>

                {/* Options */}
                <div className="options-section">
                  <p className="options-label">Select outputs</p>
                  <div className="options-grid">
                    {OPTION_META.map(({ key, icon: Icon, label, desc }) => (
                      <div
                        key={key}
                        className={`option-card${selectedOptions[key] ? ' active' : ''}`}
                        onClick={() => toggleOption(key)}
                      >
                        <div className="option-card-top">
                          <div className="option-card-left">
                            <div className="option-icon">
                              <Icon size={14} color={selectedOptions[key] ? 'rgba(100,210,200,0.9)' : 'rgba(100,210,200,0.45)'} />
                            </div>
                            <span className="option-name">{label}</span>
                          </div>
                          <div className="option-toggle" />
                        </div>
                        <p className="option-desc">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customize: only shows controls relevant to enabled options */}
                {(selectedOptions.summary || selectedOptions.topicBased || selectedOptions.subtitles) && (
                  <div className="customize-section">
                    <p className="customize-eyebrow">Customize</p>

                    {(selectedOptions.summary || selectedOptions.topicBased) && (
                      <div className="customize-row">
                        <div className="customize-label">
                          Summary length
                          <span className="customize-label-hint">
                            {summaryLength === 'short' && 'Brief — 1–2 paragraphs, 3 key points'}
                            {summaryLength === 'medium' && 'Balanced — 3–5 paragraphs, 5 key points'}
                            {summaryLength === 'long' && 'Detailed — 6–8 paragraphs, 8 key points'}
                          </span>
                        </div>
                        <div className="seg-toggle">
                          {['short', 'medium', 'long'].map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setSummaryLength(l)}
                              className={`seg-btn${summaryLength === l ? ' active' : ''}`}
                            >
                              {l[0].toUpperCase() + l.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOptions.subtitles && (
                      <div className="customize-row">
                        <div className="customize-label">
                          Subtitle format
                          <span className="customize-label-hint">
                            {subtitleFormat === 'srt' ? 'SRT — universal video player support' : 'WebVTT — modern web standard'}
                          </span>
                        </div>
                        <div className="seg-toggle">
                          {['srt', 'vtt'].map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setSubtitleFormat(f)}
                              className={`seg-btn${subtitleFormat === f ? ' active' : ''}`}
                            >
                              {f.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedOptions.topicBased && (
                  <div className="topic-wrap">
                    <span className="topic-label">Topic</span>
                    <input
                      type="text"
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      placeholder="e.g. machine learning, business strategy…"
                      className="topic-input"
                    />
                  </div>
                )}

                {error && (
                  <div className="error-bar">
                    <AlertCircle size={15} color="#fca5a5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="actions">
                  <button onClick={handleProcess} className="btn-teal" style={{ fontSize: '0.9rem', padding: '13px 36px' }}>
                    <Zap size={15} />
                    Start processing
                  </button>
                </div>
              </div>
            )}

            {/* ── Processing ── */}
            {isProcessing && (
              <div>
                <div className="phase-card">
                  <div className="phase-card-header">
                    <div>
                      <div className="phase-filename">{videoFile.name}</div>
                      <div className="phase-hint">Processing in progress — this may take a few minutes</div>
                    </div>
                    <div className="live-pill">
                      <div className="live-dot" />
                      <span className="live-label">Live</span>
                    </div>
                  </div>

                  <div className="phases-list">
                    {activePhases.map((phase) => {
                      const isDone   = completedPhaseIds.includes(phase.id);
                      const isActive = currentPhaseId === phase.id;
                      const msgs     = PHASE_MESSAGES[phase.id] || PHASE_MESSAGES.default;
                      const msg      = msgs[phaseMessageIdx % msgs.length];

                      return (
                        <div key={phase.id} className={`phase-row${!isDone && !isActive ? ' dim' : ''}`}>
                          <div className="phase-status">
                            {isDone ? (
                              <div className="status-done">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            ) : isActive ? (
                              <div className="status-spin" />
                            ) : (
                              <div className="status-idle" />
                            )}
                          </div>
                          <div className="phase-text">
                            <p className={`phase-name ${isDone ? 'done' : isActive ? 'active' : 'idle'}`}>
                              {phase.label}
                            </p>
                            {isActive && <p className="phase-msg" key={msg}>{msg}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="skeleton-grid">
                  {selectedOptions.subtitles && <SkeletonCard lines={9} />}
                  {selectedOptions.summary && <SkeletonCard lines={5} />}
                  {selectedOptions.topicBased && <SkeletonCard lines={5} />}
                  {selectedOptions.keyframes && <SkeletonCard lines={5} />}
                  {selectedOptions.transcript && <SkeletonCard lines={8} />}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Results ── */}
        {results && (
          <div>
            <div className="success-bar">
              <div className="success-icon">
                <CheckCircle size={18} color="#22c55e" />
              </div>
              <div>
                <div className="success-title">Processing complete</div>
                <div className="success-sub">{videoFile.name} — all outputs are ready</div>
              </div>
            </div>

            {/* ── Hero: video player ────────────────────────────────────────── */}
            {results.video_url && (
              <div className="results-hero">
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                  className="results-hero-video"
                >
                  <source src={`${API_BASE_URL}${results.video_url}`} />
                  {results.subtitles_vtt_url && (
                    <track
                      kind="subtitles"
                      label="English"
                      srcLang="en"
                      src={`${API_BASE_URL}${results.subtitles_vtt_url}`}
                      default
                    />
                  )}
                  Your browser does not support inline video playback.
                </video>
              </div>
            )}

            {/* ── Stack of full-width sections ──────────────────────────────── */}
            <div className="results-stack">

              {/* AI summary */}
              {selectedOptions.summary && results.summary && (
                <section className="result-section">
                  <div className="rs-head">
                    <div className="rs-head-left">
                      <div className="rs-head-icon">
                        <Brain size={16} color="rgba(100,210,200,0.9)" />
                      </div>
                      <div className="rs-head-text">
                        <h3 className="rs-title">AI summary</h3>
                        <span className="rs-subtitle">
                          {(results.summary.summary_length || 'medium')[0].toUpperCase() + (results.summary.summary_length || 'medium').slice(1)} length
                          {results.summary.word_count ? ` · ${results.summary.word_count} words` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="rs-tools">
                      <span className={`badge ${results.summary.summary_type === 'gemini' ? 'badge-teal' : 'badge-dim'}`}>
                        {results.summary.summary_type === 'gemini' ? 'Gemini' : 'Extractive'}
                      </span>
                      <button onClick={() => handleDownload('summary')} className="result-dl" title="Download">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="rs-body">
                    <p>{results.summary.text}</p>
                    {results.summary.key_points?.length > 0 && (
                      <div className="key-points-list">
                        <span className="key-points-eyebrow">Key points</span>
                        {results.summary.key_points.map((point, i) => (
                          <div key={i} className="key-point">
                            <div className="key-bullet" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Topic analysis (independent from AI summary) */}
              {selectedOptions.topicBased && results.topic_analysis && (
                <section className="result-section topic-section">
                  <div className="rs-head">
                    <div className="rs-head-left">
                      <div className="rs-head-icon">
                        <Languages size={16} color="rgba(232, 200, 110, 0.95)" />
                      </div>
                      <div className="rs-head-text">
                        <h3 className="rs-title">Topic analysis</h3>
                        <span className="rs-subtitle">
                          {results.topic_analysis.topic
                            ? <>Focus: <em style={{ color: 'rgba(232,200,110,0.85)', fontStyle: 'normal' }}>{results.topic_analysis.topic}</em></>
                            : 'No topic specified'}
                          {typeof results.topic_analysis.relevant_segments_found === 'number' &&
                            ` · ${results.topic_analysis.relevant_segments_found} relevant segments`}
                        </span>
                      </div>
                    </div>
                    <div className="rs-tools">
                      <span className="badge badge-dim">Topic</span>
                      <button onClick={() => handleDownload('topic')} className="result-dl" title="Download">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="rs-body">
                    <p>{results.topic_analysis.summary}</p>
                    {results.topic_analysis.key_points?.length > 0 && (
                      <div className="key-points-list">
                        <span className="key-points-eyebrow">Key mentions</span>
                        {results.topic_analysis.key_points.map((point, i) => (
                          <div key={i} className="key-point">
                            <div className="key-bullet" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Keyframes — clickable thumbnails that seek the video */}
              {selectedOptions.keyframes && (
                <section className="result-section">
                  <div className="rs-head">
                    <div className="rs-head-left">
                      <div className="rs-head-icon">
                        <Image size={16} color="rgba(100,210,200,0.9)" />
                      </div>
                      <div className="rs-head-text">
                        <h3 className="rs-title">Keyframes</h3>
                        <span className="rs-subtitle">
                          {results.keyframes.length > 0
                            ? `${results.keyframes.length} moments — click to jump to that timestamp`
                            : 'No keyframes extracted'}
                        </span>
                      </div>
                    </div>
                    <div className="rs-tools">
                      <button onClick={() => handleDownload('keyframes')} className="result-dl" title="Download timestamps">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="rs-body">
                    {results.keyframes.length === 0 ? (
                      <div className="kf-empty">No keyframes extracted.</div>
                    ) : (
                      <div className="kf-strip">
                        {results.keyframes.map((kf, i) => {
                          const url = kf.frame_url ? `${API_BASE_URL}${kf.frame_url}` : null;
                          const ts = typeof kf.timestamp === 'number'
                            ? `${Math.floor(kf.timestamp / 60)}:${String(Math.floor(kf.timestamp % 60)).padStart(2, '0')}`
                            : (kf.timestamp || `${i + 1}`);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => seekToTimestamp(kf.timestamp)}
                              className="kf-cell-btn"
                              title={`Jump to ${ts}`}
                            >
                              {url && <img src={url} alt={`Keyframe at ${ts}`} loading="lazy" />}
                              <div className="kf-cell-overlay">
                                <span className="kf-cell-time">{ts}</span>
                                <span className="kf-cell-jump"><Play size={9} /> Jump</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Transcript */}
              {selectedOptions.transcript && (
                <section className="result-section">
                  <div className="rs-head">
                    <div className="rs-head-left">
                      <div className="rs-head-icon">
                        <FileText size={16} color="rgba(100,210,200,0.9)" />
                      </div>
                      <div className="rs-head-text">
                        <h3 className="rs-title">Transcript</h3>
                        <span className="rs-subtitle">Full text from the video audio</span>
                      </div>
                    </div>
                    <div className="rs-tools">
                      <button onClick={() => handleDownload('transcript')} className="result-dl" title="Download">
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="rs-body">
                    <pre>{results.transcript}</pre>
                  </div>
                </section>
              )}

              {/* Raw subtitles — collapsed by default */}
              {selectedOptions.subtitles && results.subtitles && (
                <div className="collapsible-section">
                  <button
                    type="button"
                    onClick={() => setShowRawSrt(v => !v)}
                    className="collapsible-toggle"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Clock size={14} color="rgba(100,210,200,0.7)" />
                      Raw subtitles ({subtitleFormat.toUpperCase()})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); handleDownload('subtitles'); }}
                        style={{ color: 'var(--teal-dim)', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        <Download size={13} /> Download
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                        {showRawSrt ? '▾' : '▸'}
                      </span>
                    </span>
                  </button>
                  {showRawSrt && (
                    <div className="collapsible-content">
                      <pre>{results.subtitles}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="results-actions">
              <button onClick={resetUpload} className="btn-teal">
                <RotateCcw size={14} />
                Process another
              </button>
              <Link to="/profile" className="btn-glass">
                View history
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VideoUpload;