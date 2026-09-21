import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import '../Login.css';

/* ── tiny sub-components ────────────────────────────────────────── */

function InputField({ icon: Icon, type, placeholder, value, onChange, toggle, showPw, onToggle, error }) {
  return (
    <div className={`lf-field ${error ? 'lf-field--error' : ''}`}>
      <Icon size={16} className="lf-field__icon" aria-hidden="true" />
      <input
        className="lf-field__input"
        type={toggle ? (showPw ? 'text' : 'password') : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={type === 'email' ? 'email' : 'current-password'}
      />
      {toggle && (
        <button
          type="button"
          className="lf-field__eye"
          onClick={onToggle}
          aria-label={showPw ? 'Hide password' : 'Show password'}
        >
          {showPw
            ? <EyeOff size={15} aria-hidden="true" />
            : <Eye    size={15} aria-hidden="true" />}
        </button>
      )}
      {error && <p className="lf-field__err"><AlertCircle size={12} aria-hidden="true" /> {error}</p>}
    </div>
  );
}

function SocialBtn({ logo, label, onClick }) {
  return (
    <button className="social-btn" onClick={onClick} type="button">
      <span className="social-btn__logo" aria-hidden="true">{logo}</span>
      {label}
    </button>
  );
}

/* ── Forgot password view ───────────────────────────────────────── */
function ForgotView({ onBack }) {
  const [email, setEmail]     = useState('');
  const [sent,  setSent]      = useState(false);

  function handleSend(e) {
    e.preventDefault();
    if (email) setSent(true);
  }

  return (
    <div className="auth-view fade-in">
      <button className="back-btn" onClick={onBack} aria-label="Back to login">
        ← Back
      </button>
      <h2 className="auth-heading">Reset password</h2>
      <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

      {sent ? (
        <div className="sent-confirm">
          <div className="sent-confirm__icon" aria-hidden="true">✉️</div>
          <p className="sent-confirm__text">
            Reset link sent to <strong>{email}</strong>. Check your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend}>
          <InputField
            icon={Mail}
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button className="auth-submit" type="submit" disabled={!email}>
            Send reset link <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

/* ── Sign up view ───────────────────────────────────────────────── */
function SignUpView({ onSwitch, onSuccess }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!name.trim())           e.name     = 'Name is required';
    if (!email.includes('@'))   e.email    = 'Enter a valid email';
    if (password.length < 6)    e.password = 'At least 6 characters';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    localStorage.setItem('rm_auth', JSON.stringify({ name, email }));
    onSuccess();
  }

  return (
    <div className="auth-view fade-in">
      <h2 className="auth-heading">Create account</h2>
      <p className="auth-sub">Join your commute community.</p>

      <div className="social-row">
        <SocialBtn logo="G" label="Google"    onClick={onSuccess} />
        <SocialBtn logo="" label="Apple"    onClick={onSuccess} />
      </div>

      <div className="divider"><span>or email</span></div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={`lf-field ${errors.name ? 'lf-field--error' : ''}`}>
          <span className="lf-field__icon lf-field__icon--text" aria-hidden="true">👤</span>
          <input
            className="lf-field__input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
          {errors.name && <p className="lf-field__err"><AlertCircle size={12} aria-hidden="true" /> {errors.name}</p>}
        </div>

        <InputField
          icon={Mail}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={errors.email}
        />

        <InputField
          icon={Lock}
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          toggle
          showPw={showPw}
          onToggle={() => setShowPw(s => !s)}
          error={errors.password}
        />

        <button className="auth-submit" type="submit">
          Create account <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button className="auth-switch__link" onClick={onSwitch} type="button">
          Log in
        </button>
      </p>
    </div>
  );
}

/* ── Log in view ────────────────────────────────────────────────── */
function LogInView({ onSwitch, onForgot, onSuccess }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    // Simulate auth — in production this hits your Node.js API
    localStorage.setItem('rm_auth', JSON.stringify({ email }));
    onSuccess();
  }

  return (
    <div className="auth-view fade-in">
      <h2 className="auth-heading">Welcome back</h2>
      <p className="auth-sub">Log in to your commute community.</p>

      <div className="social-row">
        <SocialBtn logo="G" label="Google" onClick={onSuccess} />
        <SocialBtn logo="" label="Apple"  onClick={onSuccess} />
      </div>

      <div className="divider"><span>or email</span></div>

      {error && (
        <div className="auth-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <InputField
          icon={Mail}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
        />
        <InputField
          icon={Lock}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          toggle
          showPw={showPw}
          onToggle={() => setShowPw(s => !s)}
        />

        <button
          className="auth-forgot"
          type="button"
          onClick={onForgot}
        >
          Forgot password?
        </button>

        <button className="auth-submit" type="submit">
          Log in <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      <p className="auth-switch">
        Don't have an account?{' '}
        <button className="auth-switch__link" onClick={onSwitch} type="button">
          Sign up
        </button>
      </p>
    </div>
  );
}

/* ── Main Login page ────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login' | 'signup' | 'forgot'

  function handleSuccess() {
    const onboarded = localStorage.getItem('rm_onboarded');
    if (onboarded) {
      navigate('/home', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }

  return (
    <div className="login-page">
      {/* Header */}
      <div className="login-header">
        <div className="login-header__logo">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#C7EF4E"/>
            <path d="M12 24 Q18 14 24 20 Q30 26 36 16"
              stroke="#003310" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="12" cy="24" r="3" fill="#003310"/>
            <circle cx="36" cy="16" r="3" fill="#003310"/>
          </svg>
          <span>Route Mate</span>
        </div>
      </div>

      {/* Auth card */}
      <div className="login-card">
        {view === 'login'  && (
          <LogInView
            onSwitch={() => setView('signup')}
            onForgot={() => setView('forgot')}
            onSuccess={handleSuccess}
          />
        )}
        {view === 'signup' && (
          <SignUpView
            onSwitch={() => setView('login')}
            onSuccess={handleSuccess}
          />
        )}
        {view === 'forgot' && (
          <ForgotView onBack={() => setView('login')} />
        )}
      </div>
    </div>
  );
}