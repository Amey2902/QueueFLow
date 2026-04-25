import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { generateRoomToken, getRoomStatus, logout, getSlots, bookSlot, getMyBooking, cancelMyBooking } from '../api';

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function SlotBookingPanel({ roomCode }) {
  const [slots, setSlots] = useState([]);
  const [myBooking, setMyBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [booking, setBooking] = useState(false);

  async function refresh() {
    try {
      const [s, b] = await Promise.all([getSlots(roomCode), getMyBooking(roomCode)]);
      setSlots(s); setMyBooking(b);
    } catch (_) {}
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [roomCode]);
  useEffect(() => { const t = setInterval(refresh, 30000); return () => clearInterval(t); }, [roomCode]);

  async function handleBook() {
    if (!selected) return;
    setBooking(true); setMessage(null);
    try {
      await bookSlot(selected, roomCode);
      await refresh(); setSelected(null);
      setMessage({ type: 'success', text: 'Slot confirmed!' });
    } catch (err) { await refresh(); setMessage({ type: 'error', text: err.message }); }
    finally { setBooking(false); }
  }

  async function handleCancel() {
    try { await cancelMyBooking(roomCode); await refresh(); setMessage({ type: 'success', text: 'Booking cancelled.' }); }
    catch (err) { setMessage({ type: 'error', text: err.message }); }
  }

  if (loading || slots.length === 0) return null;

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Book a Time Slot</h3>
      {myBooking ? (
        <div>
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            Slot booked: <strong>{myBooking.slotId?.startTime ? `${formatTime(myBooking.slotId.startTime)} – ${formatTime(myBooking.slotId.endTime)}` : 'unavailable'}</strong>
          </div>
          <button className="btn btn-ghost btn-full" onClick={handleCancel}>Cancel Booking</button>
        </div>
      ) : (
        <>
          <div className="slot-grid" style={{ marginBottom: selected ? 12 : 0 }}>
            {slots.map(slot => {
              const full = slot.bookedCount >= slot.maxCapacity;
              const expired = new Date(slot.endTime) < new Date();
              const disabled = full || expired || slot.disabled;
              const isSel = selected === slot._id;
              return (
                <button key={slot._id} className={`slot-pill${isSel ? ' selected' : ''}${disabled ? ' full' : ''}`}
                  disabled={disabled} onClick={() => !disabled && setSelected(isSel ? null : slot._id)}>
                  <div style={{ fontWeight: 600 }}>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    {slot.disabled ? 'Disabled' : expired ? 'Expired' : full ? 'Full' : `${slot.maxCapacity - slot.bookedCount} left`}
                  </div>
                </button>
              );
            })}
          </div>
          {selected && (
            <button className="btn btn-primary btn-full" onClick={handleBook} disabled={booking}>
              {booking ? 'Booking…' : 'Confirm Booking'}
            </button>
          )}
        </>
      )}
      {message && (
        <div className={`alert alert-${message.type === 'error' ? 'warning' : 'success'}`} style={{ marginTop: 12 }}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}
    </div>
  );
}

export default function RoomDashboard() {
  const { roomCode } = useParams();
  const { setRole, setEmail, setRoomCode } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [loading, setLoading] = useState(true);
  const consecutiveFailures = useRef(0);
  const statusRef = useRef(null);
  const joinedRef = useRef(false);

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    setRole(null); setEmail(null); setRoomCode(null); navigate('/');
  }

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    async function joinAndFetch() {
      try { await generateRoomToken(roomCode); } catch (err) {
        if (err.message !== 'You already have an active token') { setError(err.message); setLoading(false); return; }
      }
      try { const s = await getRoomStatus(); setStatus(s); statusRef.current = s; } catch (_) {}
      setLoading(false);
    }
    joinAndFetch();
  }, []);

  useEffect(() => {
    if (loading) return;
    function poll() {
      if (statusRef.current?.status === 'done') return;
      getRoomStatus()
        .then(data => { consecutiveFailures.current = 0; setPollError(null); setStatus(data); statusRef.current = data; })
        .catch(err => {
          if (err.message?.includes('404') || err.message?.includes('No active')) {
            const done = { ...(statusRef.current || {}), status: 'done' };
            statusRef.current = done; setStatus(done); return;
          }
          consecutiveFailures.current += 1;
          if (consecutiveFailures.current >= 5) setPollError('Connection issue. Retrying…');
        });
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) return (
    <div className="page-app">
      <div style={{ background: 'var(--brand-dark)', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );

  if (error) return (
    <div className="page-app">
      <div style={{ background: 'var(--brand-dark)', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: 'white', fontWeight: 600 }}>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Go Back</button>
      </div>
    </div>
  );

  if (!status) return null;

  const isDone = status.status === 'done';
  const isServing = status.status === 'serving';
  const isNear = status.tokensAhead <= 1 && status.status === 'waiting';

  return (
    <div className="page-app">
      {/* Dark green header with token number */}
      <div style={{ background: 'var(--brand-dark)', padding: '0 24px 64px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{status.roomName || 'Queue'}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{roomCode}</div>
          </div>
          <button className="btn-topbar" onClick={handleLogout}>Logout</button>
        </div>

        {/* Token hero */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Your Token</p>
          <div style={{ fontSize: 96, fontWeight: 700, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {status.tokenNumber || '—'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            {status.counterLabel && (
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                Go to: {status.counterLabel}
              </span>
            )}
            {status.isSlotBooking && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                Priority — Slot Booked
              </span>
            )}
            <span style={{
              background: isServing ? 'var(--primary)' : isDone ? 'rgba(255,255,255,0.2)' : 'rgba(239,159,39,0.25)',
              color: isServing ? 'white' : isDone ? 'rgba(255,255,255,0.7)' : '#EF9F27',
              borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase'
            }}>
              {status.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content cards */}
      <div style={{ maxWidth: 480, margin: '-40px auto 0', padding: '0 16px 32px' }}>
        {isDone && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="alert alert-success">✅ Your token has been completed. Thank you!</div>
          </div>
        )}
        {isServing && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="alert alert-success" style={{ fontWeight: 600 }}>🎉 It's your turn! Please proceed to the counter.</div>
          </div>
        )}
        {isNear && !isServing && (
          <div className="card">
            <div className="alert alert-warning">⚡ Almost your turn! Get ready.</div>
          </div>
        )}

        {!isDone && (
          <div className="card">
            {status.highTraffic && <div className="alert alert-warning" style={{ marginBottom: 12 }}>🚦 High traffic — estimated times may vary.</div>}
            <div className="status-row">
              <div className="status-pill pill-teal">
                <span className="pill-value">{status.currentlyServingToken || '—'}</span>
                <span className="pill-label">Now Serving</span>
              </div>
              <div className="status-pill pill-amber">
                <span className="pill-value">~{status.estimatedWaitTimeMin ?? '—'} min</span>
                <span className="pill-label">Est. Wait</span>
              </div>
              <div className="status-pill pill-neutral">
                <span className="pill-value">{status.tokensAhead}</span>
                <span className="pill-label">Ahead of You</span>
              </div>
            </div>
            {pollError && <p className="error" style={{ textAlign: 'center', marginTop: 8 }}>⚠️ {pollError}</p>}
          </div>
        )}

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>Updates every 5 seconds</p>
        <SlotBookingPanel roomCode={roomCode} />
      </div>
    </div>
  );
}
