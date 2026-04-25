import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom, logout } from '../api';
import { useAuth } from '../App';

export default function JoinQueue() {
  const { email, setRole, setEmail: setAuthEmail, setRoomCode } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    setRole(null); setAuthEmail(null); setRoomCode(null); navigate('/');
  }

  async function handleJoin(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await joinRoom(code.trim().toUpperCase());
      setRole('participant'); setRoomCode(result.roomCode);
      navigate(`/room/${result.roomCode}`);
    } catch (err) {
      if (err.status === 410) setError('This queue is currently closed.');
      else if (err.status === 404) setError('Room not found. Please check your code.');
      else setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="page-app">
      {/* Dark green top bar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="brand-dot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/>
            </svg>
          </div>
          QueueFlow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
              {initials}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{email}</span>
          </div>
          <button className="btn-topbar" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Hero band */}
      <div style={{ background: 'var(--brand-dark)', padding: '32px 24px 72px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          Hey, {email?.split('@')[0]} 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Enter a room code to join the queue</p>
      </div>

      {/* Floating card */}
      <div style={{ maxWidth: 420, margin: '-48px auto 0', padding: '0 16px 40px' }}>
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleJoin}>
            <label className="label">Room code</label>
            <input
              type="text"
              className={`input input-mono${error ? ' input-error' : ''}`}
              placeholder="e.g. DEMO-99"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              required autoFocus
              style={{ marginBottom: error ? 6 : 20 }}
            />
            {error && <p className="error mb-12">{error}</p>}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Joining…' : 'Join Queue'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>
          Don't have a code? Ask the organizer for it.
        </p>
      </div>
    </div>
  );
}
