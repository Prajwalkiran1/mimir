import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #0a1a1a;
      --glass-bg:     rgba(20, 55, 52, 0.45);
      --glass-border: rgba(100, 210, 190, 0.18);
      --glass-shine:  rgba(160, 240, 220, 0.07);
      --teal:         #64d2c8;
      --teal-dim:     rgba(100, 210, 200, 0.55);
      --white:        #f0faf8;
      --text:         rgba(220, 248, 242, 0.82);
      --text-dim:     rgba(180, 230, 220, 0.5);
      --font-serif:   'DM Serif Display', Georgia, serif;
      --font-sans:    'DM Sans', sans-serif;
      --font-brand:   'Cinzel Decorative', cursive;
    }

    .login-wrap {
      font-family: var(--font-sans);
      min-height: 100vh;
      background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      position: relative; overflow: hidden;
    }

    /* Mesh */
    .login-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(100,210,200,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,210,200,0.022) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 10%, transparent 80%);
    }

    /* Orbs */
    .login-orb {
      position: fixed; border-radius: 50%; pointer-events: none; filter: blur(80px); z-index: 0;
    }
    .login-orb-1 {
      width: 550px; height: 550px;
      background: radial-gradient(circle, rgba(100,210,200,0.08) 0%, transparent 70%);
      top: -150px; right: -100px;
      animation: orbDrift 14s ease-in-out infinite;
    }
    .login-orb-2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(80,160,150,0.06) 0%, transparent 70%);
      bottom: -80px; left: -80px;
      animation: orbDrift 18s ease-in-out infinite reverse;
    }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(14px,-20px) scale(1.03); }
      66% { transform: translate(-10px,10px) scale(0.97); }
    }

    /* ── Card ── */
    .login-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 420px;
      background: var(--glass-bg);
      backdrop-filter: blur(32px) saturate(160%);
      -webkit-backdrop-filter: blur(32px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: 28px;
      padding: 40px 36px 36px;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 28px 72px rgba(0,0,0,0.5);
      animation: riseIn 0.8s cubic-bezier(0.23,1,0.32,1) both;
    }
    .login-card::before {
      content: '';
      position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(200,255,245,0.3), transparent);
      pointer-events: none;
    }

    @keyframes riseIn {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .login-header { text-align: center; margin-bottom: 36px; }

    .login-brand {
      display: inline-flex; align-items: center; gap: 10px;
      text-decoration: none; margin-bottom: 28px;
    }
    .login-brand img {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid rgba(100,210,200,0.35);
    }
    .login-brand-name {
      font-family: var(--font-brand); font-size: 1.25rem;
      color: var(--teal); letter-spacing: 0.02em;
    }

    .login-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(100,210,200,0.09);
      border: 1.5px solid rgba(100,210,200,0.28);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 22px;
      position: relative;
    }
    .login-avatar::after {
      content: ''; position: absolute; inset: -5px; border-radius: 50%;
      border: 1px solid rgba(100,210,200,0.1);
    }

    .login-eyebrow {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--teal-dim); margin-bottom: 8px;
    }
    .login-h1 {
      font-family: var(--font-serif); font-size: 1.9rem;
      font-weight: 400; color: var(--white); line-height: 1.1;
      margin-bottom: 8px; letter-spacing: -0.01em;
    }
    .login-h1 em { font-style: italic; color: var(--teal); }
    .login-sub {
      font-size: 0.85rem; color: var(--text-dim); font-weight: 300; line-height: 1.6;
    }

    /* ── Form ── */
    .login-form { display: flex; flex-direction: column; gap: 16px; }

    /* Error bar */
    .error-bar {
      background: rgba(220,38,38,0.07);
      border: 1px solid rgba(220,38,38,0.22);
      border-radius: 10px; padding: 10px 14px;
      display: flex; align-items: center; gap: 8px;
      color: #fca5a5; font-size: 0.84rem; font-weight: 300;
    }

    /* Field */
    .field { display: flex; flex-direction: column; gap: 7px; }
    .field-label {
      font-size: 0.68rem; font-weight: 500; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--text-dim);
    }
    .field-input-wrap { position: relative; }
    .field-icon {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      color: var(--text-dim); pointer-events: none; display: flex;
    }
    .field-input {
      width: 100%;
      background: rgba(5, 18, 18, 0.55);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 12px 14px 12px 42px;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.9rem; font-weight: 300;
      outline: none; transition: border-color 0.25s, box-shadow 0.25s;
      caret-color: var(--teal);
    }
    .field-input::placeholder { color: var(--text-dim); }
    .field-input:focus {
      border-color: rgba(100,210,200,0.4);
      box-shadow: 0 0 0 3px rgba(100,210,200,0.07);
    }
    .field-input.error { border-color: rgba(220,38,38,0.35); }
    .field-input.pr { padding-right: 44px; }

    .field-error { font-size: 0.76rem; color: #fca5a5; font-weight: 300; }

    .eye-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--text-dim); display: flex; transition: color 0.2s; padding: 2px;
    }
    .eye-btn:hover { color: var(--teal); }

    /* Remember / forgot row */
    .login-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 2px;
    }
    .remember-label {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      font-size: 0.82rem; color: var(--text-dim); font-weight: 300;
    }
    .remember-label input[type="checkbox"] {
      width: 15px; height: 15px; accent-color: var(--teal); cursor: pointer;
    }
    .forgot-link {
      font-size: 0.82rem; color: var(--teal-dim); text-decoration: none;
      font-weight: 300; transition: color 0.2s;
    }
    .forgot-link:hover { color: var(--teal); }

    /* Submit button */
    .btn-submit {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, rgba(100,210,200,0.9) 0%, rgba(80,190,175,0.9) 100%);
      border: 1px solid rgba(160,240,220,0.3);
      border-radius: 100px; color: #061414;
      font-family: var(--font-sans); font-size: 0.9rem; font-weight: 500;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(100,210,200,0.2);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
      margin-top: 4px;
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 32px rgba(100,210,200,0.3);
    }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Spinner */
    .spin-ring {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(6,20,20,0.3);
      border-top-color: #061414;
      animation: spinAnim 0.7s linear infinite;
    }
    @keyframes spinAnim { to { transform: rotate(360deg); } }

    /* Footer */
    .login-footer {
      text-align: center; margin-top: 28px;
      font-size: 0.84rem; color: var(--text-dim); font-weight: 300;
    }
    .login-footer a {
      color: var(--teal); text-decoration: none; font-weight: 400; transition: color 0.2s;
    }
    .login-footer a:hover { color: var(--white); }

    /* Divider */
    .login-divider {
      height: 1px; margin: 4px 0;
      background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
    }
  `}</style>
);

/* ─── Main ───────────────────────────────────────────────────────────────────── */
const Login = () => {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [errors, setErrors]             = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const redirectTo = location.state?.from || '/landing';

  const validateForm = () => {
    const newErrors = {};
    if (!username) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted with:', { username, password });

    const formErrors = validateForm();
    console.log('Login form validation errors:', formErrors);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log('Calling login function...');
      const result = await login(username, password);
      console.log('Login function result:', result);

      if (result.success) {
        console.log('Login successful, navigating to', redirectTo);
        navigate(redirectTo, { replace: true });
      } else {
        console.log('Login failed:', result.error);
        setErrors({ general: result.error || 'Login failed. Please try again.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <PageStyles />

      {/* Atmosphere */}
      <div className="login-mesh" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      <div className="login-card">

        {/* Brand */}
        <div className="login-header">
          <Link to="/landing" className="login-brand">
            <img src="/logo.png" alt="Mimir" />
            <span className="login-brand-name">Mimir</span>
          </Link>

          <div className="login-avatar">
            <User size={26} color="rgba(100,210,200,0.7)" />
          </div>

          <p className="login-eyebrow">Welcome back</p>
          <h1 className="login-h1">Sign in to <em>Mimir</em></h1>
          <p className="login-sub">Access your video intelligence dashboard</p>
        </div>

        <div className="login-divider" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: 24 }}>

          {errors.general && (
            <div className="error-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errors.general}
            </div>
          )}

          {/* Username */}
          <div className="field">
            <label className="field-label">Username</label>
            <div className="field-input-wrap">
              <span className="field-icon"><User size={15} /></span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`field-input${errors.username ? ' error' : ''}`}
                placeholder="your username"
                autoComplete="username"
              />
            </div>
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

          {/* Password */}
          <div className="field">
            <label className="field-label">Password</label>
            <div className="field-input-wrap">
              <span className="field-icon"><Lock size={15} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`field-input pr${errors.password ? ' error' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-btn"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          {/* Remember / Forgot */}
          <div className="login-row">
            <label className="remember-label">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="forgot-link">Forgot password?</a>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isLoading} className="btn-submit">
            {isLoading ? (
              <>
                <div className="spin-ring" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one</Link>
        </div>

      </div>
    </div>
  );
};

export default Login;