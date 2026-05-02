import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const PageStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=Cinzel+Decorative:wght@700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #0a0f1a;
      --bg-mid:       #0d1520;
      --bg-light:     #111d2a;
      --glass-bg:     rgba(20, 35, 55, 0.50);
      --glass-border: rgba(201, 168, 76, 0.18);
      --glass-shine:  rgba(240, 210, 130, 0.07);
      --gold:         #c9a84c;
      --gold-bright:  #f0d070;
      --gold-dim:     rgba(201, 168, 76, 0.55);
      --white:        #fdf8ee;
      --text:         rgba(248, 235, 190, 0.82);
      --text-dim:     rgba(220, 195, 130, 0.5);
      --font-serif:   'DM Serif Display', Georgia, serif;
      --font-sans:    'DM Sans', sans-serif;
      --font-brand:   'Cinzel Decorative', cursive;
    }

    .signup-wrap {
      font-family: var(--font-sans);
      min-height: 100vh;
      background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      position: relative; overflow: hidden;
    }

    .signup-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(201,168,76,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,168,76,0.022) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 10%, transparent 80%);
    }

    .signup-orb { position: fixed; border-radius: 50%; pointer-events: none; filter: blur(80px); z-index: 0; }
    .signup-orb-1 {
      width: 550px; height: 550px;
      background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
      top: -150px; right: -100px;
      animation: orbDrift 14s ease-in-out infinite;
    }
    .signup-orb-2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(160,120,40,0.06) 0%, transparent 70%);
      bottom: -80px; left: -80px;
      animation: orbDrift 18s ease-in-out infinite reverse;
    }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(14px,-20px) scale(1.03); }
      66% { transform: translate(-10px,10px) scale(0.97); }
    }

    /* Card */
    .signup-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 460px;
      background: var(--glass-bg);
      backdrop-filter: blur(32px) saturate(160%);
      -webkit-backdrop-filter: blur(32px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: 28px;
      padding: 40px 36px 36px;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 28px 72px rgba(0,0,0,0.5);
      animation: riseIn 0.8s cubic-bezier(0.23,1,0.32,1) both;
    }
    .signup-card::before {
      content: '';
      position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(240,210,130,0.3), transparent);
      pointer-events: none;
    }

    @keyframes riseIn {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .signup-header { text-align: center; margin-bottom: 30px; }
    .signup-brand {
      display: inline-flex; align-items: center; gap: 10px;
      text-decoration: none; margin-bottom: 22px;
    }
    .signup-brand img {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid rgba(201,168,76,0.35);
    }
    .signup-brand-name {
      font-family: var(--font-brand); font-size: 1.25rem;
      color: var(--gold); letter-spacing: 0.02em;
    }

    .signup-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(201,168,76,0.09);
      border: 1.5px solid rgba(201,168,76,0.28);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 18px; position: relative;
    }
    .signup-avatar::after {
      content: ''; position: absolute; inset: -5px; border-radius: 50%;
      border: 1px solid rgba(201,168,76,0.1);
    }

    .signup-eyebrow {
      font-size: 0.65rem; font-weight: 500; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--gold-dim); margin-bottom: 8px;
    }
    .signup-h1 {
      font-family: var(--font-serif); font-size: 1.7rem;
      font-weight: 400; color: var(--white); line-height: 1.1;
      margin-bottom: 8px; letter-spacing: -0.01em;
    }
    .signup-h1 em { font-style: italic; color: var(--gold); }
    .signup-sub {
      font-size: 0.85rem; color: var(--text-dim); font-weight: 300; line-height: 1.6;
    }

    .signup-divider {
      height: 1px; margin: 4px 0;
      background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
    }

    .signup-form { display: flex; flex-direction: column; gap: 14px; margin-top: 22px; }

    .error-bar {
      background: rgba(220,38,38,0.07);
      border: 1px solid rgba(220,38,38,0.22);
      border-radius: 10px; padding: 10px 14px;
      display: flex; align-items: center; gap: 8px;
      color: #fca5a5; font-size: 0.84rem; font-weight: 300;
    }

    .field { display: flex; flex-direction: column; gap: 6px; }
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
      background: rgba(5, 10, 20, 0.55);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 11px 14px 11px 42px;
      color: var(--white); font-family: var(--font-sans);
      font-size: 0.9rem; font-weight: 300;
      outline: none; transition: border-color 0.25s, box-shadow 0.25s;
      caret-color: var(--gold);
    }
    .field-input::placeholder { color: var(--text-dim); }
    .field-input:focus {
      border-color: rgba(201,168,76,0.4);
      box-shadow: 0 0 0 3px rgba(201,168,76,0.07);
    }
    .field-input.error { border-color: rgba(220,38,38,0.35); }
    .field-input.pr { padding-right: 44px; }

    .field-error { font-size: 0.74rem; color: #fca5a5; font-weight: 300; }

    .eye-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--text-dim); display: flex; transition: color 0.2s; padding: 2px;
    }
    .eye-btn:hover { color: var(--gold); }

    .terms-row {
      display: flex; align-items: flex-start; gap: 8px; cursor: pointer;
      font-size: 0.78rem; color: var(--text-dim); font-weight: 300; line-height: 1.55;
      margin-top: 4px;
    }
    .terms-row input[type="checkbox"] {
      width: 14px; height: 14px; accent-color: var(--gold); cursor: pointer; margin-top: 2px;
    }
    .terms-row a { color: var(--gold-dim); text-decoration: none; transition: color 0.2s; }
    .terms-row a:hover { color: var(--gold); }

    .btn-submit {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, rgba(201,168,76,0.9) 0%, rgba(170,130,40,0.9) 100%);
      border: 1px solid rgba(240,210,130,0.3);
      border-radius: 100px; color: #0a0f1a;
      font-family: var(--font-sans); font-size: 0.9rem; font-weight: 500;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(201,168,76,0.2);
      transition: all 0.3s cubic-bezier(0.23,1,0.32,1);
      margin-top: 6px;
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 32px rgba(201,168,76,0.3);
    }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    .spin-ring {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(10,15,26,0.3);
      border-top-color: #0a0f1a;
      animation: spinAnim 0.7s linear infinite;
    }
    @keyframes spinAnim { to { transform: rotate(360deg); } }

    .signup-footer {
      text-align: center; margin-top: 24px;
      font-size: 0.84rem; color: var(--text-dim); font-weight: 300;
    }
    .signup-footer a {
      color: var(--gold); text-decoration: none; font-weight: 400; transition: color 0.2s;
    }
    .signup-footer a:hover { color: var(--white); }

    /* Success card */
    .success-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 420px;
      background: var(--glass-bg);
      backdrop-filter: blur(32px) saturate(160%);
      -webkit-backdrop-filter: blur(32px) saturate(160%);
      border: 1px solid var(--glass-border);
      border-radius: 28px;
      padding: 48px 36px;
      text-align: center;
      box-shadow: inset 0 1.5px 0 var(--glass-shine), 0 28px 72px rgba(0,0,0,0.5);
      animation: riseIn 0.6s cubic-bezier(0.23,1,0.32,1) both;
    }
    .success-icon {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 22px;
    }
    .success-h2 {
      font-family: var(--font-serif); font-size: 1.7rem; font-weight: 400;
      color: var(--white); margin-bottom: 8px; letter-spacing: -0.01em;
    }
    .success-p { font-size: 0.92rem; color: var(--text); font-weight: 300; margin-bottom: 6px; }
    .success-redirect { font-size: 0.78rem; color: var(--text-dim); font-weight: 300; }
  `}</style>
);

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return; }

    setIsLoading(true);
    setErrors({});
    try {
      const result = await register(formData.username, formData.email, formData.password);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrors({ general: result.error || 'Signup failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="signup-wrap">
        <PageStyles />
        <div className="signup-mesh" />
        <div className="signup-orb signup-orb-1" />
        <div className="signup-orb signup-orb-2" />
        <div className="success-card">
          <div className="success-icon">
            <Check size={36} color="#86efac" strokeWidth={2.5} />
          </div>
          <h2 className="success-h2">Account created</h2>
          <p className="success-p">Your account has been successfully created.</p>
          <p className="success-redirect">Redirecting to sign-in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-wrap">
      <PageStyles />

      <div className="signup-mesh" />
      <div className="signup-orb signup-orb-1" />
      <div className="signup-orb signup-orb-2" />

      <div className="signup-card">
        <div className="signup-header">
          <Link to="/landing" className="signup-brand">
            <img src="/logo.png" alt="Mimir" />
            <span className="signup-brand-name">Mimir</span>
          </Link>

          <div className="signup-avatar">
            <User size={26} color="rgba(201,168,76,0.7)" />
          </div>

          <p className="signup-eyebrow">Get started</p>
          <h1 className="signup-h1">Join <em>Mimir</em></h1>
          <p className="signup-sub">Create your account to start processing videos</p>
        </div>

        <div className="signup-divider" />

        <form onSubmit={handleSubmit} className="signup-form">
          {errors.general && (
            <div className="error-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errors.general}
            </div>
          )}

          <div className="field">
            <label className="field-label">Username</label>
            <div className="field-input-wrap">
              <span className="field-icon"><User size={15} /></span>
              <input
                type="text" name="username" value={formData.username} onChange={handleChange}
                className={`field-input${errors.username ? ' error' : ''}`}
                placeholder="your username" autoComplete="username"
              />
            </div>
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

          <div className="field">
            <label className="field-label">Email</label>
            <div className="field-input-wrap">
              <span className="field-icon"><Mail size={15} /></span>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                className={`field-input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com" autoComplete="email"
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="field-input-wrap">
              <span className="field-icon"><Lock size={15} /></span>
              <input
                type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                onChange={handleChange} className={`field-input pr${errors.password ? ' error' : ''}`}
                placeholder="••••••••" autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn" tabIndex={-1}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div className="field">
            <label className="field-label">Confirm Password</label>
            <div className="field-input-wrap">
              <span className="field-icon"><Lock size={15} /></span>
              <input
                type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                className={`field-input pr${errors.confirmPassword ? ' error' : ''}`}
                placeholder="••••••••" autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="eye-btn" tabIndex={-1}>
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
          </div>

          <label className="terms-row">
            <input type="checkbox" />
            <span>
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </span>
          </label>

          <button type="submit" disabled={isLoading} className="btn-submit">
            {isLoading ? (
              <>
                <div className="spin-ring" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="signup-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
