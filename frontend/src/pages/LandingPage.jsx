import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, organizerRegister, organizerLogin, counterLogin } from '../api';
import { useAuth } from '../App';

function OtpInput({ onComplete, hasError }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  function handleChange(i, val) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.every(x => x)) onComplete(next.join(''));
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setDigits(text.split('')); refs.current[5]?.focus(); onComplete(text); }
    e.preventDefault();
  }

  return (
    <div className="otp-row">
      {digits.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          className={`otp-box${hasError ? ' error' : ''}`}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste} autoFocus={i === 0} />
      ))}
    </div>
  );
}

function Countdown({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left > 0 ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Resend in {left}s</span> : null;
}

export default function LandingPage() {
  const [mode, setMode] = useState('user');
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [adminMode, setAdminMode] = useState('login');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setRole, setEmail: setAuthEmail } = useAuth();
  const navigate = useNavigate();

  async function handleSendOtp(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await sendOtp(email); setStep('otp'); setCanResend(false); }
    catch (err) { setError(err.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp(code) {
    if (code.length < 6) return;
    setError(''); setOtpError(false); setLoading(true);
    try {
      const data = await verifyOtp(email, code);
      setAuthEmail(data.email); setRole(data.role); navigate('/join');
    } catch (err) { setOtpError(true); setError(err.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    try { await sendOtp(email); setCanResend(false); setError(''); setOtpError(false); } catch (_) {}
  }

  async function handleAdminSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      let data;
      try { data = await counterLogin(adminEmail, adminPassword); setAuthEmail(data.email); setRole('counter'); navigate(`/counter/${data.roomCode}`); return; } catch (_) {}
      data = adminMode === 'register' ? await organizerRegister(adminName, adminEmail, adminPassword) : await organizerLogin(adminEmail, adminPassword);
      setAuthEmail(data.email); setRole('organizer'); navigate('/admin');
    } catch (err) { setError(err.message || 'Invalid credentials.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-center">
      {/* Hero band */}
      <div className="hero-band">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>QueueFlow</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Smart digital queues for every occasion</p>
      </div>

      {/* Floating card */}
      <div className="hero-card-wrap" style={{ maxWidth: 420, margin: '-48px auto 0', padding: '0 16px 40px' }}>
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          {[{ id: 'user', label: 'Join a Queue' }, { id: 'admin', label: 'Admin / Organizer' }].map(t => (
            <button key={t.id} className={`tab-btn${mode === t.id ? ' active' : ''}`}
              onClick={() => { setMode(t.id); setError(''); setStep('email'); }}>{t.label}</button>
          ))}
        </div>

        <div className="card" style={{ padding: 28 }}>
          {mode === 'user' && step === 'email' && (
            <form onSubmit={handleSendOtp}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Welcome</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Enter your email to get started</p>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required style={{ marginBottom: 16 }} />
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
              {error && <p className="error mt-8">{error}</p>}
            </form>
          )}

          {mode === 'user' && step === 'otp' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Enter OTP</h2>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Code sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>
                </p>
              </div>
              <OtpInput onComplete={handleVerifyOtp} hasError={otpError} />
              {error && <p className="error mt-12" style={{ textAlign: 'center' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, fontSize: 13 }}>
                {canResend
                  ? <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>Resend OTP</button>
                  : <Countdown seconds={42} onDone={() => setCanResend(true)} />
                }
                <button type="button" onClick={() => { setStep('email'); setError(''); setOtpError(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                  Change email
                </button>
              </div>
              {loading && <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>Verifying…</p>}
            </div>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminSubmit}>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Admin Portal</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Organizers and counter staff</p>
              <div className="tab-bar" style={{ marginBottom: 16 }}>
                {['login', 'register'].map(m => (
                  <button key={m} type="button" className={`tab-btn${adminMode === m ? ' active' : ''}`}
                    onClick={() => { setAdminMode(m); setError(''); }}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
              {adminMode === 'register' && (
                <div style={{ marginBottom: 12 }}>
                  <label className="label">Organization name</label>
                  <input type="text" className="input" placeholder="e.g. MIT College" value={adminName} onChange={e => setAdminName(e.target.value)} required />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="admin@example.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="••••••••" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? 'Please wait…' : adminMode === 'register' ? 'Create Account' : 'Sign In'}
              </button>
              {error && <p className="error mt-8" style={{ textAlign: 'center' }}>{error}</p>}
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>
          Users join with OTP · Admins register with password
        </p>
      </div>
    </div>
  );
}
