import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { logout } from '../api';

const BASE = 'http://localhost:5000';
async function api(path, method = 'GET') {
  const res = await fetch(`${BASE}${path}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  return res.json();
}

export default function CounterDashboard() {
  const { roomCode } = useParams();
  const { setRole, setEmail } = useAuth();
  const navigate = useNavigate();
  const [label, setLabel] = useState('');
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api('/api/auth/me').then(d => {
      if (!d.role || d.role !== 'counter') { navigate('/'); return; }
      setLabel(d.counterLabel || '');
    });
  }, []);

  async function fetchQueue() {
    try {
      const data = await api(`/api/queue/counter/${roomCode}/queue`);
      if (Array.isArray(data)) {
        data.sort((a, b) => (a.sortOrder ?? a.tokenNumber * 1000) - (b.sortOrder ?? b.tokenNumber * 1000));
        setTokens(data);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); const t = setInterval(fetchQueue, 5000); return () => clearInterval(t); }, []);

  async function handleNext() {
    setMessage(null);
    const r = await api(`/api/queue/counter/${roomCode}/next`, 'POST');
    setMessage({ type: r.error ? 'error' : 'success', text: r.message || r.error });
    await fetchQueue();
  }

  async function handleSkip() {
    setMessage(null);
    const r = await api(`/api/queue/counter/${roomCode}/skip`, 'POST');
    setMessage({ type: r.error ? 'error' : 'success', text: r.message || r.error });
    await fetchQueue();
  }

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    setRole(null); setEmail(null); navigate('/');
  }

  const serving = tokens.find(t => t.status === 'serving');
  const waiting = tokens.filter(t => t.status === 'waiting');

  return (
    <div className="page-app">
      {/* Dark green header */}
      <div style={{ background: 'var(--brand-dark)', padding: '0 24px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{label || 'Counter'}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{roomCode}</div>
          </div>
          <button className="btn-topbar" onClick={handleLogout}>Logout</button>
        </div>

        {/* Now serving in header */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Now Serving</p>
          {serving ? (
            <>
              <div style={{ fontSize: 80, fontWeight: 700, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {serving.tokenNumber}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8 }}>{serving.studentEmail}</p>
              {serving.isSlotBooking && (
                <span style={{ display: 'inline-block', marginTop: 6, background: 'var(--primary)', color: 'white', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                  Slot Booking
                </span>
              )}
            </>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, paddingBottom: 8 }}>No one being served</div>
          )}
        </div>
      </div>

      {/* Action card */}
      <div style={{ maxWidth: 480, margin: '-40px auto 0', padding: '0 16px 32px' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleNext}>▶ Next Token</button>
            <button className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={handleSkip}>⏭ Skip</button>
          </div>
          {message && (
            <div className={`alert alert-${message.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 12 }}>
              {message.type === 'error' ? '⚠️' : '✅'} {message.text}
            </div>
          )}
        </div>

        {/* Queue preview */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Up Next</h3>
            <span className="badge badge-waiting">{waiting.length} waiting</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
            </div>
          ) : waiting.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <div className="empty-sub">Queue is empty</div>
            </div>
          ) : (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <table>
                <thead><tr><th>Token #</th><th>Participant</th><th>Type</th></tr></thead>
                <tbody>
                  {waiting.slice(0, 6).map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{t.tokenNumber}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-sub)' }}>{t.studentEmail}</td>
                      <td>{t.isSlotBooking ? <span className="badge badge-slot">Slot</span> : <span className="badge badge-done">Walk-in</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
