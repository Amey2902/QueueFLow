import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  logout, getServices, getAdminQueue, nextToken, resetQueue,
  createRoom, listRooms, getRoomQueue, advanceRoomQueue, resetRoomQueue, setRoomStatus, skipRoomToken,
  generateSlots, clearSlots, getSlots, deleteRoom, addCounter, getCounters, deleteCounter, disableSlot
} from '../api';

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Counter Panel ────────────────────────────────────────────
function CounterPanel({ roomCode }) {
  const [counters, setCounters] = useState([]);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [show, setShow] = useState(false);

  async function fetchCounters() {
    try { const c = await getCounters(roomCode); setCounters(c); } catch (_) {}
  }

  useEffect(() => { fetchCounters(); }, [roomCode]);

  async function handleAdd(e) {
    e.preventDefault(); setResult(null); setLoading(true);
    try {
      await addCounter(roomCode, label, email, password);
      setResult({ type: 'success', text: `Counter "${label}" added` });
      setLabel(''); setEmail(''); setPassword('');
      await fetchCounters();
    } catch (err) { setResult({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this counter?')) return;
    try { await deleteCounter(id); await fetchCounters(); } catch (_) {}
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: counters.length > 0 || show ? 12 : 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Counters ({counters.length})</p>
        <button onClick={() => setShow(v => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          {show ? 'Hide' : '+ Add Counter'}
        </button>
      </div>
      {counters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: show ? 12 : 0 }}>
          {counters.map(c => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--white)', borderRadius: 8, padding: '5px 10px', border: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{c.label}</span>
              <span style={{ color: 'var(--muted)' }}>{c.email}</span>
              <button onClick={() => handleDelete(c._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
      {show && (
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="text" className="input" placeholder="Label (e.g. Counter A)" value={label} onChange={e => setLabel(e.target.value)} required style={{ flex: 1, minWidth: 120, padding: '8px 10px', fontSize: 13 }} />
            <input type="email" className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ flex: 2, minWidth: 150, padding: '8px 10px', fontSize: 13 }} />
            <input type="password" className="input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ flex: 1, minWidth: 100, padding: '8px 10px', fontSize: 13 }} />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ fontSize: 13, padding: '8px 14px' }}>
              {loading ? '…' : 'Add'}
            </button>
          </div>
          {result && <div className={`alert alert-${result.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 8, fontSize: 13 }}>{result.text}</div>}
        </form>
      )}
    </div>
  );
}

// ── Slot Config Panel ────────────────────────────────────────
function SlotConfigPanel({ roomCode }) {
  const [duration, setDuration] = useState('30');
  const [capacity, setCapacity] = useState('5');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState([]);
  const [showSlots, setShowSlots] = useState(false);

  useEffect(() => {
    if (!showSlots) return;
    const t = setInterval(async () => { try { const s = await getSlots(roomCode); setSlots(s); } catch (_) {} }, 15000);
    return () => clearInterval(t);
  }, [showSlots, roomCode]);

  async function handleGenerate(e) {
    e.preventDefault(); setLoading(true); setResult(null);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    try {
      const r = await generateSlots(roomCode, { slotDurationMin: Number(duration), maxCapacity: Number(capacity), startHour: sh + sm / 60, endHour: eh + em / 60 });
      setResult({ type: 'success', text: r.message });
      const s = await getSlots(roomCode); setSlots(s); setShowSlots(true);
    } catch (err) { setResult({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  }

  async function handleViewSlots() {
    try { const s = await getSlots(roomCode); setSlots(s); setShowSlots(v => !v); } catch (_) {}
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Slot Booking</p>
        <button onClick={handleViewSlots} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          {showSlots ? 'Hide Slots' : 'View Slots'}
        </button>
      </div>
      <form onSubmit={handleGenerate}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            { label: 'Duration (min)', val: duration, set: setDuration, type: 'number', min: 5, max: 120 },
            { label: 'Max/slot', val: capacity, set: setCapacity, type: 'number', min: 1, max: 100 },
            { label: 'Start Time', val: startTime, set: setStartTime, type: 'time' },
            { label: 'End Time', val: endTime, set: setEndTime, type: 'time' },
          ].map(f => (
            <div key={f.label} style={{ flex: 1, minWidth: 100 }}>
              <label className="label">{f.label}</label>
              <input type={f.type} className="input" value={f.val} onChange={e => f.set(e.target.value)}
                min={f.min} max={f.max} required style={{ padding: '8px 10px', fontSize: 13 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} disabled={loading}>
            {loading ? 'Generating…' : 'Generate Slots'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }} onClick={async () => {
            if (!window.confirm('Clear all slots and bookings for today?')) return;
            try { await clearSlots(roomCode); setSlots([]); setShowSlots(false); setResult({ type: 'success', text: 'Slots cleared.' }); }
            catch (err) { setResult({ type: 'error', text: err.message }); }
          }}>Clear Slots</button>
        </div>
      </form>
      {result && <div className={`alert alert-${result.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 8, fontSize: 13 }}>{result.text}</div>}
      {showSlots && slots.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 280, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ fontSize: 13 }}>
            <thead><tr><th>Time</th><th>Booked</th><th>Cap</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {slots.map(s => {
                const expired = new Date(s.endTime) < new Date();
                const inactive = s.disabled || expired;
                return (
                  <tr key={s._id} style={{ opacity: inactive ? 0.5 : 1 }}>
                    <td>{formatTime(s.startTime)} – {formatTime(s.endTime)}</td>
                    <td style={{ fontWeight: 600, color: s.bookedCount >= s.maxCapacity ? 'var(--danger)' : 'var(--success)' }}>{s.bookedCount}</td>
                    <td>{s.maxCapacity}</td>
                    <td><span className={`badge ${inactive ? 'badge-done' : s.bookedCount >= s.maxCapacity ? 'badge-done' : 'badge-serving'}`}>
                      {s.disabled ? 'Disabled' : expired ? 'Expired' : s.bookedCount >= s.maxCapacity ? 'Full' : 'Open'}
                    </span></td>
                    <td>{!inactive && (
                      <button onClick={async () => {
                        if (!window.confirm('Disable this slot?')) return;
                        try { await disableSlot(s._id); const u = await getSlots(roomCode); setSlots(u); } catch (err) { alert(err.message); }
                      }} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        Disable
                      </button>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Room Panel ───────────────────────────────────────────────
function RoomPanel({ room, onStatusChange }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  async function fetchQueue() {
    try {
      const d = await getRoomQueue(room.roomCode);
      const list = d.tokens || d;
      list.sort((a, b) => (a.sortOrder ?? a.tokenNumber * 1000) - (b.sortOrder ?? b.tokenNumber * 1000));
      setTokens(list);
    } catch (err) { setMessage({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); }, [room.roomCode]);
  useEffect(() => { const t = setInterval(fetchQueue, 5000); return () => clearInterval(t); }, [room.roomCode]);

  async function handleNext() {
    setMessage(null);
    try { const r = await advanceRoomQueue(room.roomCode); setMessage({ text: r.message, type: 'success' }); await fetchQueue(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  async function handleSkip() {
    setMessage(null);
    try { const r = await skipRoomToken(room.roomCode); setMessage({ text: r.message, type: 'success' }); await fetchQueue(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  async function handleReset() {
    if (!window.confirm(`Reset queue for "${room.name}"? This cannot be undone.`)) return;
    try { await resetRoomQueue(room.roomCode); setMessage({ text: 'Queue reset successfully', type: 'success' }); await fetchQueue(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  async function handleToggleStatus() {
    const newStatus = room.status === 'active' ? 'closed' : 'active';
    try { await setRoomStatus(room.roomCode, newStatus); onStatusChange(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete room "${room.name}"? This will remove all tokens and cannot be undone.`)) return;
    try { await deleteRoom(room.roomCode); onStatusChange(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  function handleCopy() {
    navigator.clipboard.writeText(room.roomCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const serving = tokens.filter(t => t.status === 'serving').length;
  const waiting = tokens.filter(t => t.status === 'waiting').length;
  const missed  = tokens.filter(t => t.status === 'missed').length;

  return (
    <div className="card" style={{ borderLeft: `3px solid ${room.status === 'active' ? 'var(--primary)' : 'var(--border)'}` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{room.name}</h3>
            <span className={`badge badge-${room.status}`}>{room.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div className="room-code-display" style={{ fontSize: 13, padding: '4px 12px' }}>{room.roomCode}</div>
            <button onClick={handleCopy} style={{ background: copied ? 'var(--success-light)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: copied ? 'var(--success)' : 'var(--text-sub)' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--muted)' }}>Avg: {room.avgServiceTimeMin} min/person</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
          <button onClick={handleToggleStatus}
            className={room.status === 'active' ? 'btn btn-ghost' : 'btn btn-success'}
            style={{ fontSize: 12, padding: '6px 12px' }}>
            {room.status === 'active' ? 'Close Room' : 'Reopen'}
          </button>
          <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            Delete Room
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{serving}</div>
          <div className="stat-label">Serving</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--waiting)' }}>{waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{tokens.length}</div>
          <div className="stat-label">Total</div>
        </div>
        {missed > 0 && (
          <div className="stat-box">
            <div className="stat-value" style={{ color: 'var(--muted)' }}>{missed}</div>
            <div className="stat-label">Missed</div>
          </div>
        )}
      </div>

      {/* Queue table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
        </div>
      ) : (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table>
            <thead><tr><th>Token #</th><th>Participant</th><th>Status</th><th>Counter</th></tr></thead>
            <tbody>
              {tokens.length === 0
                ? <tr><td colSpan={4}>
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <div className="empty-sub">No active tokens</div>
                    </div>
                  </td></tr>
                : tokens.map((t, i) => (
                  <tr key={i} className={`row-${t.status}`}>
                    <td style={{ fontWeight: 700, color: t.status === 'missed' ? 'var(--muted)' : 'var(--primary)' }}>#{t.tokenNumber}</td>
                    <td style={{ fontSize: 13 }}>
                      {t.studentEmail}
                      {t.isSlotBooking && <span className="badge badge-slot" style={{ marginLeft: 8 }}>Slot</span>}
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{t.counterLabel || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-success" style={{ flex: 1 }} onClick={handleNext}>▶ Next Token</button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleSkip}>⏭ Skip</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleReset}>Reset</button>
      </div>

      {message && (
        <div className={`alert alert-${message.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 10 }}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      <SlotConfigPanel roomCode={room.roomCode} />
      <CounterPanel roomCode={room.roomCode} />
    </div>
  );
}

// ── Create Room Form ─────────────────────────────────────────
function CreateRoomForm({ onCreated }) {
  const [name, setName] = useState('');
  const [avgTime, setAvgTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault(); setResult(null); setLoading(true);
    try {
      const room = await createRoom(name, Number(avgTime));
      setResult({ type: 'success', text: 'Queue created! Code: ', code: room.roomCode });
      setName(''); setAvgTime(''); onCreated();
    } catch (err) { setResult({ type: 'error', text: err.message }); }
    finally { setLoading(false); }
  }

  return (
    <div className="card" style={{ border: '1.5px dashed var(--border)' }}>
      <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 700 }}>Create New Queue</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" className="input" placeholder="Queue name (e.g. Passport Office)"
            value={name} onChange={e => setName(e.target.value)} required style={{ flex: 2, minWidth: 180 }} />
          <input type="number" className="input" placeholder="Avg min/person"
            value={avgTime} onChange={e => setAvgTime(e.target.value)} min={1} max={120} required style={{ flex: 1, minWidth: 120 }} />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Creating…' : 'Create Queue'}
          </button>
        </div>
      </form>
      {result && (
        <div className={`alert alert-${result.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 12 }}>
          {result.text}
          {result.code && <span className="room-code-display" style={{ marginLeft: 8, fontSize: 13, padding: '3px 10px' }}>{result.code}</span>}
        </div>
      )}
    </div>
  );
}

// ── Service Queue Panel (legacy) ─────────────────────────────
function ServiceQueuePanel({ service }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  async function fetchQueue() {
    try { const d = await getAdminQueue(service._id); setTokens(d); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); }, []);

  async function handleNext() {
    try { const r = await nextToken(service._id); setMessage({ text: r.message, type: 'success' }); await fetchQueue(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  async function handleReset() {
    if (!window.confirm(`Reset queue for ${service.name}?`)) return;
    try { await resetQueue(service._id); setMessage({ text: 'Queue reset', type: 'success' }); await fetchQueue(); }
    catch (err) { setMessage({ text: err.message, type: 'error' }); }
  }

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--border)' }}>
      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 700 }}>{service.name}</h3>
      {loading ? <div className="skeleton" style={{ height: 80, borderRadius: 8 }} /> : (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table>
            <thead><tr><th>Token #</th><th>Student</th><th>Status</th></tr></thead>
            <tbody>
              {tokens.length === 0
                ? <tr><td colSpan={3}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-sub">No tokens</div></div></td></tr>
                : tokens.map(t => (
                  <tr key={t._id} className={`row-${t.status}`}>
                    <td style={{ fontWeight: 700 }}>#{t.tokenNumber}</td>
                    <td style={{ fontSize: 13 }}>{t.studentEmail}</td>
                    <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn btn-success" style={{ flex: 1 }} onClick={handleNext}>▶ Next Token</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleReset}>Reset</button>
      </div>
      {message && <div className={`alert alert-${message.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 10 }}>{message.text}</div>}
    </div>
  );
}

// ── Admin Dashboard ──────────────────────────────────────────
export default function AdminDashboard() {
  const { setRole, setEmail } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    setRole(null); setEmail(null); navigate('/');
  }

  async function fetchAll() {
    try {
      const [svcs, rms] = await Promise.all([getServices(), listRooms()]);
      setServices(svcs); setRooms(rms);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div className="page-app">
      <div className="topbar">
        <div className="topbar-brand"><div className="brand-dot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/><rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/><rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/></svg></div>QueueFlow</div>
      </div>
      <div className="container-wide" style={{ paddingTop: 32 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="page-app">
      <div className="topbar">
        <div className="topbar-brand">QueueFlow</div>
      </div>
      <div className="container-wide" style={{ paddingTop: 32 }}>
        <div className="card"><p className="error">⚠️ {error}</p></div>
      </div>
    </div>
  );

  const totalWaiting = rooms.reduce((sum, r) => sum + (r.waitingCount || 0), 0);

  return (
    <div className="page-app">
      {/* Dark green topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="brand-dot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/>
            </svg>
          </div>
          <div>
            <div>QueueFlow</div>
            <div className="topbar-sub">Admin Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {totalWaiting > 20 && (
            <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
              {totalWaiting} waiting
            </span>
          )}
          <button className="btn-topbar" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="container-wide" style={{ paddingTop: 24 }}>
        <CreateRoomForm onCreated={fetchAll} />

        {rooms.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '20px 0 10px' }}>
              Active Rooms ({rooms.length})
            </p>
            {rooms.map(room => <RoomPanel key={room.roomCode} room={room} onStatusChange={fetchAll} />)}
          </>
        )}

        {services.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '20px 0 10px' }}>
              Legacy Queues
            </p>
            {services.map(service => <ServiceQueuePanel key={service._id} service={service} />)}
          </>
        )}

        {rooms.length === 0 && services.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No queues yet</div>
              <div className="empty-sub">Create your first queue above to get started.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
