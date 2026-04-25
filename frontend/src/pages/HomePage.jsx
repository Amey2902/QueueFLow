import React from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '🎫',
    title: 'Instant Token',
    desc: 'Join any queue in seconds with a room code. No app download, no registration hassle.'
  },
  {
    icon: '📅',
    title: 'Slot Booking',
    desc: 'Reserve a time slot in advance and skip to the front of your window. Plan your visit.'
  },
  {
    icon: '📊',
    title: 'Live Queue Status',
    desc: 'See exactly how many people are ahead, your estimated wait time, and get notified when it\'s your turn.'
  },
  {
    icon: '🪟',
    title: 'Multi-Counter',
    desc: 'Distribute the queue across multiple service counters. Each counter manages their own flow.'
  },
  {
    icon: '🔔',
    title: 'Email Alerts',
    desc: 'Get notified by email when you\'re a few spots away. No need to keep watching the screen.'
  },
  {
    icon: '⚡',
    title: 'Smart Priority',
    desc: 'Fair ordering that respects both walk-ins and slot bookers — no one gets unfairly skipped.'
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--brand-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>QueueFlow</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/login')}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Sign In
          </button>
          <button onClick={() => navigate('/login')}
            style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(160deg, var(--brand-dark) 0%, var(--brand-mid) 100%)',
        padding: '80px 24px 100px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,182,122,0.15)', border: '1px solid rgba(0,182,122,0.3)',
          borderRadius: 20, padding: '5px 14px', marginBottom: 24,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
          <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>Digital Queue Management System</span>
        </div>

        <h1 style={{
          color: 'white', fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em',
          maxWidth: 700, margin: '0 auto 20px',
        }}>
          Skip the wait.<br />
          <span style={{ color: 'var(--primary)' }}>Join the queue.</span>
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.65)', fontSize: 18, lineHeight: 1.6,
          maxWidth: 520, margin: '0 auto 40px',
        }}>
          QueueFlow replaces physical queues with a smart digital system. Book slots, track your position in real time, and get notified when it's your turn.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/login')}
            style={{
              background: 'var(--primary)', border: 'none', color: 'white',
              borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 20px rgba(0,182,122,0.35)',
            }}>
            Join a Queue →
          </button>
          <button onClick={() => navigate('/login')}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
            Admin Login
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap' }}>
          {[
            { value: 'Real-time', label: 'Queue Updates' },
            { value: 'OTP', label: 'Secure Login' },
            { value: 'Multi', label: 'Counter Support' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ background: 'var(--surface)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 48, color: 'var(--text)' }}>
            Three steps to a better queue
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Get your OTP', desc: 'Enter your email and verify with a one-time code. No password needed.' },
              { step: '02', title: 'Enter room code', desc: 'Type the code shared by the organizer to join the right queue.' },
              { step: '03', title: 'Track & wait', desc: 'See your position live, book a slot for priority, and get notified when it\'s your turn.' },
            ].map(s => (
              <div key={s.step} style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>{s.step}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{s.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ background: 'white', padding: '72px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Features</p>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Everything you need</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{ padding: '24px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA band ── */}
      <div style={{ background: 'var(--brand-dark)', padding: '72px 24px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Ready to ditch the physical queue?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 32 }}>
          Get started in under a minute. No setup required.
        </p>
        <button onClick={() => navigate('/login')}
          style={{
            background: 'var(--primary)', border: 'none', color: 'white',
            borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 20px rgba(0,182,122,0.35)',
          }}>
          Get Started →
        </button>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: '#061F16', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="10.75" width="13" height="2.5" rx="1.25" fill="white"/>
              <rect x="3" y="16.5" width="9" height="2.5" rx="1.25" fill="white"/>
            </svg>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>QueueFlow</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Digital Queue Management System · College Project</span>
      </div>
    </div>
  );
}
