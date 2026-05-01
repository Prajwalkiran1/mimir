import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, FileVideo, Clock, FileText, Download, Settings,
  CheckCircle, AlertCircle, RotateCcw, X, ChevronRight,
  Brain, Languages, Image, Search, Play, Zap
} from 'lucide-react';
import { apiService } from '../services/api';

/* ─── Fonts ─────────────────────────────────────────────────────────────────── */
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
      --text-faint: rgba(219,234,254,0.55);
      --border-subtle: rgba(250,204,21,0.14);
      --border-hover: rgba(250,204,21,0.32);
      --font-display: 'Barlow Condensed', sans-serif;
      --font-body: 'Barlow', sans-serif;
      --font-brand: 'Cinzel Decorative', cursive;
    }

    .mimir-wrap {
      font-family: var(--font-body);
      background: var(--bg-deep);
      min-height: 100vh;
      color: var(--white);
      position: relative;
      overflow-x: hidden;
    }

    /* Noise texture */
    .mimir-wrap::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: 0.45;
    }

    /* Grid */
    .mimir-wrap::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        repeating-linear-gradient(0deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px),
        repeating-linear-gradient(90deg, rgba(250,204,21,0.03) 0, rgba(250,204,21,0.03) 1px, transparent 1px, transparent 60px);
      -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%);
      mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%);
      pointer-events: none;
      z-index: 0;
    }

    /* ── Nav ── */
    .mimir-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(3,9,26,0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
    }

    .mimir-nav-inner {
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
      gap: 2rem;
    }

    .nav-link {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }

    .nav-link:hover { color: var(--accent); }

    /* ── Page layout ── */
    .mimir-page {
      position: relative;
      z-index: 1;
      max-width: 1280px;
      margin: 0 auto;
      padding: 4rem 2rem 6rem;
    }

    /* ── Header ── */
    .page-header {
      text-align: center;
      margin-bottom: 4rem;
    }

    .page-eyebrow {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1rem;
    }

    .page-title {
      font-family: var(--font-display);
      font-size: clamp(3rem, 6vw, 5rem);
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 0.95;
      color: var(--white);
      margin-bottom: 1rem;
    }

    .page-title span { color: var(--accent); }

    .page-subtitle {
      font-family: var(--font-body);
      font-size: 1.05rem;
      color: var(--text-muted);
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.65;
    }

    /* ── Upload zone ── */
    .upload-zone {
      max-width: 700px;
      margin: 0 auto;
      border: 1px dashed rgba(250,204,21,0.25);
      border-radius: 20px;
      padding: 4rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,58,95,0.3));
      position: relative;
      overflow: hidden;
    }

    .upload-zone::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(250,204,21,0.04), transparent 70%);
      pointer-events: none;
    }

    .upload-zone:hover, .upload-zone.dragging {
      border-color: var(--accent);
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.5));
      transform: translateY(-2px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(250,204,21,0.08);
    }

    .upload-icon-wrap {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: rgba(250,204,21,0.08);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      transition: all 0.3s;
    }

    .upload-zone:hover .upload-icon-wrap,
    .upload-zone.dragging .upload-icon-wrap {
      background: rgba(250,204,21,0.14);
      border-color: var(--accent);
    }

    .upload-title {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--white);
      margin-bottom: 0.5rem;
    }

    .upload-sub {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text-faint);
      margin-bottom: 2rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--accent);
      color: #03091a;
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 0.9rem 2rem;
      border: none;
      cursor: pointer;
      clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: var(--accent-light);
      box-shadow: 0 8px 30px rgba(250,204,21,0.35);
      transform: translateY(-1px);
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--white);
      font-family: var(--font-display);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 0.85rem 1.8rem;
      border: 1px solid rgba(255,255,255,0.2);
      cursor: pointer;
      clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-ghost:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* ── File pill ── */
    .file-pill {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.4));
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }

    .file-pill-icon {
      width: 44px;
      height: 44px;
      background: rgba(250,204,21,0.08);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .file-pill-name {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      color: var(--white);
      letter-spacing: 0.02em;
    }

    .file-pill-size {
      font-size: 0.8rem;
      color: var(--text-faint);
      margin-top: 2px;
    }

    .file-pill-close {
      margin-left: auto;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint);
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .file-pill-close:hover {
      background: rgba(220,38,38,0.15);
      color: #fca5a5;
    }

    /* ── Options grid ── */
    .options-section {
      max-width: 900px;
      margin: 0 auto 2.5rem;
    }

    .options-label {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.25rem;
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
    }

    /* Option toggle card */
    .option-card {
      position: relative;
      background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,58,95,0.3));
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.1rem 1.25rem;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
      user-select: none;
      overflow: hidden;
    }

    .option-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 3px;
      height: 100%;
      background: var(--accent);
      transform: scaleY(0);
      transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
      border-radius: 0 2px 2px 0;
    }

    .option-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }

    .option-card.active {
      border-color: rgba(250,204,21,0.4);
      background: linear-gradient(145deg, rgba(250,204,21,0.06), rgba(30,58,95,0.5));
    }

    .option-card.active::before {
      transform: scaleY(1);
    }

    .option-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }

    .option-card-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .option-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(250,204,21,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .option-card.active .option-icon {
      background: rgba(250,204,21,0.14);
    }

    .option-name {
      font-family: var(--font-display);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: var(--white);
    }

    .option-toggle {
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
      transition: all 0.25s;
      flex-shrink: 0;
    }

    .option-toggle::after {
      content: '';
      position: absolute;
      left: 2px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--text-faint);
      transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .option-card.active .option-toggle {
      background: var(--accent);
      border-color: var(--accent);
    }

    .option-card.active .option-toggle::after {
      left: calc(100% - 16px);
      background: #03091a;
    }

    .option-desc {
      font-size: 0.8rem;
      color: var(--text-faint);
      line-height: 1.5;
      padding-left: 42px;
    }

    /* Topic input */
    .topic-field {
      max-width: 900px;
      margin: 0 auto 2rem;
      background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,58,95,0.2));
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .topic-field label {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .topic-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--white);
      font-family: var(--font-body);
      font-size: 0.95rem;
      caret-color: var(--accent);
    }

    .topic-input::placeholder { color: var(--text-faint); }

    /* Error bar */
    .error-bar {
      max-width: 900px;
      margin: 0 auto 1.5rem;
      background: rgba(220,38,38,0.08);
      border: 1px solid rgba(220,38,38,0.25);
      border-radius: 12px;
      padding: 0.9rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fca5a5;
      font-size: 0.9rem;
    }

    .actions {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      justify-content: center;
    }

    /* ── Processing view ── */
    .processing-wrap {
      max-width: 1100px;
      margin: 0 auto;
    }

    .phase-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.4));
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .phase-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .phase-filename {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      color: var(--white);
      letter-spacing: 0.02em;
    }

    .phase-hint {
      font-size: 0.78rem;
      color: var(--text-faint);
      margin-top: 2px;
    }

    .live-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(250,204,21,0.06);
      border: 1px solid rgba(250,204,21,0.2);
      border-radius: 100px;
      padding: 4px 12px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse-dot 1.4s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }

    .live-label {
      font-family: var(--font-display);
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: var(--accent);
    }

    .phases-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .phase-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      transition: opacity 0.5s ease;
    }

    .phase-row.dim { opacity: 0.28; }

    .phase-status {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      margin-top: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-done {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #22c55e;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-spin {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--accent);
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .status-idle {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.12);
    }

    .phase-text {
      flex: 1;
    }

    .phase-name {
      font-family: var(--font-display);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1.3;
    }

    .phase-name.done { color: #86efac; }
    .phase-name.active { color: var(--white); }
    .phase-name.idle { color: var(--text-faint); }

    .phase-msg {
      font-size: 0.78rem;
      color: var(--accent);
      font-style: italic;
      margin-top: 2px;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }

    /* Skeleton cards */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .skeleton-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,58,95,0.3));
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 1.5rem;
      overflow: hidden;
    }

    .skeleton-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 1.25rem;
    }

    .skel {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(250,204,21,0.06) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.8s infinite;
      border-radius: 6px;
    }

    @keyframes shimmer { to { background-position: -200% center; } }

    /* ── Results ── */
    .results-wrap {
      max-width: 1100px;
      margin: 0 auto;
    }

    .success-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(34,197,94,0.06);
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: 14px;
      padding: 1rem 1.5rem;
      margin-bottom: 2rem;
    }

    .success-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(34,197,94,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .success-title {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #86efac;
    }

    .success-sub {
      font-size: 0.82rem;
      color: rgba(134,239,172,0.7);
      margin-top: 2px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
      margin-bottom: 2.5rem;
    }

    .result-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,58,95,0.4));
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 1.5rem;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .result-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-3px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }

    .result-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .result-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--white);
    }

    .result-download {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(250,204,21,0.06);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--accent);
      transition: all 0.2s;
    }

    .result-download:hover {
      background: rgba(250,204,21,0.14);
      border-color: var(--accent);
    }

    .result-body {
      background: rgba(3,9,26,0.6);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      padding: 1rem;
      max-height: 220px;
      overflow-y: auto;
    }

    .result-body::-webkit-scrollbar { width: 4px; }
    .result-body::-webkit-scrollbar-track { background: transparent; }
    .result-body::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }

    .result-body pre {
      font-family: 'Fira Mono', monospace;
      font-size: 0.78rem;
      color: var(--text-muted);
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .result-body p {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.65;
    }

    .badge {
      font-family: var(--font-display);
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 100px;
    }

    .badge-purple {
      background: rgba(139,92,246,0.12);
      color: #c4b5fd;
      border: 1px solid rgba(139,92,246,0.2);
    }

    .badge-blue {
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
      border: 1px solid rgba(59,130,246,0.2);
    }

    .keyframe-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }

    .keyframe-ts {
      font-family: 'Fira Mono', monospace;
      font-size: 0.72rem;
      background: rgba(250,204,21,0.08);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 4px;
      flex-shrink: 0;
      border: 1px solid rgba(250,204,21,0.15);
    }

    .key-point-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.05);
      font-size: 0.83rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .key-bullet {
      width: 6px;
      height: 6px;
      background: var(--accent);
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .results-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* Divider */
    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(250,204,21,0.2) 30%, rgba(250,204,21,0.2) 70%, transparent);
      margin: 4rem 0;
    }
  `}</style>
);

/* ─── Phase definitions ──────────────────────────────────────────────────────── */
const getPhases = (options) => {
  const p = [{ id: 'init', label: 'Initialising pipeline', keywords: ['initializ', 'starting'] }];
  if (options.transcript) p.push({ id: 'transcription', label: 'Transcribing audio', keywords: ['transcrib', 'audio', 'speech', 'whisper', 'analyzing audio', 'loading transcription', 'processing speech', 'formatting transcription'] });
  if (options.keyframes) p.push({ id: 'keyframes', label: 'Extracting keyframes', keywords: ['keyframe', 'frame', 'visual', 'cluster'] });
  if (options.summary || options.topicBased) p.push({ id: 'summary', label: 'Generating summary', keywords: ['summar', 'gemini', 'topic', 'ai summary', 'generating ai', 'summary complete', 'generating summary'] });
  if (options.rag) p.push({ id: 'rag', label: 'Indexing knowledge', keywords: ['rag', 'chunk', 'graph', 'vector', 'index', 'retrieval', 'semantic'] });
  if (options.subtitles) p.push({ id: 'subtitles', label: 'Generating subtitles', keywords: ['subtitle', 'srt', 'caption', 'sync'] });
  return p;
};

const PHASE_MESSAGES = {
  init: ['Warming up the engines...', 'Getting everything ready...', 'Firing up the pipeline...'],
  transcription: ['Listening to every word...', 'Whispering with Whisper...', 'Decoding the audio waves...', 'Converting speech to knowledge...', 'Every word counts...'],
  keyframes: ['Picking the perfect moments...', "Freeze — that's a good one...", 'Clustering the visual story...', 'Finding frames that matter...'],
  summary: ['Reading between the lines...', 'Asking Gemini nicely...', 'Distilling the essence...', 'Connecting the dots...', 'Crafting the perfect summary...'],
  rag: ['Building the knowledge graph...', 'Weaving the semantic web...', 'Indexing for future you...', 'Thinking in vectors...'],
  subtitles: ['Syncing words to timestamps...', 'Writing the captions...', 'Timestamping every syllable...'],
  default: ['Working hard...', 'Almost there...', 'The gears are turning...', 'Still going, promise...'],
};

const OPTION_META = [
  { key: 'subtitles', icon: Clock, label: 'Subtitles', desc: 'Time-synced SRT captions' },
  { key: 'transcript', icon: FileText, label: 'Transcript', desc: 'Full text transcription' },
  { key: 'summary', icon: Brain, label: 'AI Summary', desc: 'Powered by Gemini' },
  { key: 'keyframes', icon: Image, label: 'Keyframes', desc: 'Important visual moments' },
  { key: 'rag', icon: Search, label: 'RAG Index', desc: 'Semantic search & Q&A' },
  { key: 'topicBased', icon: Languages, label: 'Topic Analysis', desc: 'Focus on a specific topic' },
];

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
const SkeletonCard = ({ lines = 6 }) => (
  <div className="skeleton-card">
    <div className="skeleton-header">
      <div className="skel" style={{ width: 28, height: 28, borderRadius: 8 }} />
      <div className="skel" style={{ width: 120, height: 14 }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 11, width: i % 3 === 2 ? '68%' : i % 3 === 1 ? '84%' : '100%' }} />
      ))}
    </div>
  </div>
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
/* ─── Main ─────────────────────────────────────────────────────────────────── */
const VideoUpload = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [results, setResults] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    subtitles: true, transcript: true, summary: true,
    keyframes: false, rag: false, topicBased: false,
  });
  const [selectedTopic, setSelectedTopic] = useState('');
  const [downloadFormat] = useState('srt');
  const [error, setError] = useState(null);

  const [phaseMessageIdx, setPhaseMessageIdx] = useState(0);
  const [currentPhaseId, setCurrentPhaseId] = useState('init');
  const [completedPhaseIds, setCompletedPhaseIds] = useState([]);

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
        rag: selectedOptions.rag, topic_based: selectedOptions.topicBased,
        topic: selectedOptions.topicBased ? selectedTopic : null,
        download_format: downloadFormat, use_gpu: true,
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
            },
            subtitles: status.results?.subtitles?.subtitles || status.results?.subtitles || 'No subtitles available',
            keyframes: status.results?.keyframes?.keyframes
              ? status.results.keyframes.keyframes.map(kf => ({ ...kf, path: kf.frame_path || kf.path || 'unknown' }))
              : [],
            rag: status.results?.rag || null,
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
      case 'subtitles': content = typeof results.subtitles === 'string' ? results.subtitles : ''; filename = `subtitles_${videoFile.name.replace(/\.[^/.]+$/, '')}.srt`; break;
      case 'summary':
        content = results.summary?.text || '';
        if (results.summary?.key_points?.length) content += '\n\nKey Points:\n' + results.summary.key_points.map(p => `• ${p}`).join('\n');
        filename = `summary_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
      case 'keyframes':
        content = (Array.isArray(results.keyframes) ? results.keyframes : []).map(kf => `${kf.timestamp || kf.time}: ${kf.description || 'Keyframe'}`).join('\n');
        filename = `keyframes_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
      case 'rag': content = results.rag?.summary?.summary || ''; filename = `rag_summary_${videoFile.name.replace(/\.[^/.]+$/, '')}.txt`; break;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setVideoFile(null); setResults(null); setIsProcessing(false); setError(null);
    setSelectedOptions({ subtitles: true, transcript: true, summary: true, keyframes: false, rag: false, topicBased: false });
  };

  const activePhases = getPhases(selectedOptions);

  return (
    <div className="mimir-wrap">
      <CustomCursor />
      <FontImport />

      {/* Nav */}
      <nav className="mimir-nav">
        <div className="mimir-nav-inner">
          <Link to="/landing" className="nav-brand">
            <img src="/logo.png" alt="Mimir" className="nav-brand-logo" />
            <span className="nav-brand-name">Mimir</span>
          </Link>
          <div className="nav-links">
            <Link to="/profile" className="nav-link">Profile</Link>
            <Link to="/landing" className="nav-link">Home</Link>
          </div>
        </div>
      </nav>

      <div className="mimir-page">
        {/* Header */}
        <div className="page-header">
          <p className="page-eyebrow">Video Processing Studio</p>
          <h1 className="page-title">Turn video into<br /><span>knowledge</span></h1>
          <p className="page-subtitle">Upload your video, choose your outputs, and let Mimir do the rest.</p>
        </div>

        {/* ── Upload zone ── */}
        {!videoFile && (
          <div
            className={`upload-zone${isDragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="upload-icon-wrap">
              <Upload size={28} color={isDragging ? '#facc15' : 'rgba(250,204,21,0.7)'} />
            </div>
            <h3 className="upload-title">{isDragging ? 'Drop it here' : 'Drop your video'}</h3>
            <p className="upload-sub">MP4 · MKV · MOV · AVI — drag and drop or click to browse</p>
            <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="video-upload" style={{ display: 'none' }} />
            <label htmlFor="video-upload">
              <span className="btn-primary" style={{ cursor: 'pointer' }}>
                <FileVideo size={16} />
                Choose File
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
                    <FileVideo size={20} color="#facc15" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-pill-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile.name}</div>
                    <div className="file-pill-size">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button onClick={resetUpload} className="file-pill-close">
                    <X size={16} />
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
                              <Icon size={15} color={selectedOptions[key] ? '#facc15' : 'rgba(250,204,21,0.5)'} />
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

                {selectedOptions.topicBased && (
                  <div className="topic-field">
                    <label>Topic</label>
                    <input
                      type="text"
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      placeholder="e.g. machine learning, business strategy..."
                      className="topic-input"
                    />
                  </div>
                )}

                {error && (
                  <div className="error-bar">
                    <AlertCircle size={16} color="#fca5a5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="actions">
                  <button onClick={handleProcess} className="btn-primary" style={{ fontSize: '0.88rem', padding: '1rem 2.5rem' }}>
                    <Zap size={16} />
                    Start Processing
                  </button>
                </div>
              </div>
            )}

            {/* ── Processing ── */}
            {isProcessing && (
              <div className="processing-wrap">
                <div className="phase-card">
                  <div className="phase-header">
                    <div>
                      <div className="phase-filename" style={{ maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile.name}</div>
                      <div className="phase-hint">Processing in progress — this may take a few minutes</div>
                    </div>
                    <div className="live-pill">
                      <div className="live-dot" />
                      <span className="live-label">Live</span>
                    </div>
                  </div>

                  <div className="phases-list">
                    {activePhases.map((phase) => {
                      const isDone = completedPhaseIds.includes(phase.id);
                      const isActive = currentPhaseId === phase.id;
                      const msgs = PHASE_MESSAGES[phase.id] || PHASE_MESSAGES.default;
                      const msg = msgs[phaseMessageIdx % msgs.length];

                      return (
                        <div key={phase.id} className={`phase-row${!isDone && !isActive ? ' dim' : ''}`}>
                          <div className="phase-status">
                            {isDone ? (
                              <div className="status-done">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                  {selectedOptions.transcript && <SkeletonCard lines={8} />}
                  {selectedOptions.subtitles && <SkeletonCard lines={7} />}
                  {(selectedOptions.summary || selectedOptions.topicBased) && <SkeletonCard lines={5} />}
                  {selectedOptions.keyframes && <SkeletonCard lines={4} />}
                  {selectedOptions.rag && <SkeletonCard lines={5} />}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Results ── */}
        {results && (
          <div className="results-wrap">
            <div className="success-bar">
              <div className="success-icon">
                <CheckCircle size={20} color="#22c55e" />
              </div>
              <div>
                <div className="success-title">Processing Complete</div>
                <div className="success-sub">{videoFile.name} — all outputs are ready</div>
              </div>
            </div>

            <div className="results-grid">
              {selectedOptions.transcript && (
                <div className="result-card">
                  <div className="result-card-header">
                    <div className="result-card-title">
                      <FileText size={16} color="#facc15" />
                      Transcript
                    </div>
                    <button onClick={() => handleDownload('transcript')} className="result-download">
                      <Download size={15} />
                    </button>
                  </div>
                  <div className="result-body">
                    <pre>{results.transcript}</pre>
                  </div>
                </div>
              )}

              {selectedOptions.subtitles && (
                <div className="result-card">
                  <div className="result-card-header">
                    <div className="result-card-title">
                      <Clock size={16} color="#facc15" />
                      Subtitles (SRT)
                    </div>
                    <button onClick={() => handleDownload('subtitles')} className="result-download">
                      <Download size={15} />
                    </button>
                  </div>
                  <div className="result-body">
                    <pre>{results.subtitles}</pre>
                  </div>
                </div>
              )}

              {(selectedOptions.summary || selectedOptions.topicBased) && results.summary && (
                <div className="result-card">
                  <div className="result-card-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="result-card-title">
                        <Brain size={16} color="#facc15" />
                        {selectedOptions.topicBased ? 'Topic Analysis' : 'AI Summary'}
                      </div>
                      {results.summary.topic && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', paddingLeft: 24 }}>Topic: {results.summary.topic}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${results.summary.summary_type === 'gemini' ? 'badge-purple' : 'badge-blue'}`}>
                        {results.summary.summary_type === 'gemini' ? 'Gemini' : 'Extractive'}
                      </span>
                      <button onClick={() => handleDownload('summary')} className="result-download">
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="result-body">
                    <p>{results.summary.text}</p>
                    {results.summary.key_points?.length > 0 && (
                      <>
                        {results.summary.key_points.map((point, i) => (
                          <div key={i} className="key-point-item">
                            <div className="key-bullet" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedOptions.keyframes && (
                <div className="result-card">
                  <div className="result-card-header">
                    <div className="result-card-title">
                      <Image size={16} color="#facc15" />
                      Keyframes
                    </div>
                    <button onClick={() => handleDownload('keyframes')} className="result-download">
                      <Download size={15} />
                    </button>
                  </div>
                  <div className="result-body">
                    {results.keyframes.length === 0
                      ? <p>No keyframes extracted.</p>
                      : results.keyframes.map((kf, i) => (
                          <div key={i} className="keyframe-row">
                            <span className="keyframe-ts">{kf.timestamp}</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{kf.description}</span>
                          </div>
                        ))}
                  </div>
                </div>
              )}

              {selectedOptions.rag && results.rag && (
                <div className="result-card">
                  <div className="result-card-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div className="result-card-title">
                        <Brain size={16} color="#facc15" />
                        RAG Summary
                      </div>
                      {results.rag.summary?.video_title && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', paddingLeft: 24 }}>{results.rag.summary.video_title}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {results.rag.summary?.method && (
                        <span className={`badge ${results.rag.summary.method === 'gemini' ? 'badge-purple' : 'badge-blue'}`}>
                          {results.rag.summary.method === 'gemini' ? 'Gemini' : 'Extractive'}
                        </span>
                      )}
                      <Link to="/search" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none' }}>
                        <Search size={13} /> Search
                      </Link>
                      <button onClick={() => handleDownload('rag')} className="result-download">
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="result-body">
                    <p>{results.rag.summary?.summary || 'No RAG summary available'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="results-actions">
              <button onClick={resetUpload} className="btn-primary">
                <RotateCcw size={15} />
                Process Another
              </button>
              <Link to="/profile" className="btn-ghost">
                View History
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;