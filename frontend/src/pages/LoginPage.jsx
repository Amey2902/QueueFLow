import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, adminLogin } from '../api';
import { useAuth } from '../App';

function EmailForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendOtp(email);
      onSuccess(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="email"
          className="input"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Sending...' : 'Send OTP'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

function OtpForm({ email, onChangeEmail }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const { setRole, setEmail: setAuthEmail } = useAuth();
  const navigate = useNavigate();

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setResendMsg('');
    setLoading(true);
    try {
      const data = await verifyOtp(email, otp);
      setAuthEmail(data.email);
      setRole(data.role);
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    onChangeEmail();
  }

  return (
    <form onSubmit={handleVerify}>
      <p style={{ marginBottom: 12, fontSize: 14 }}>OTP sent to <strong>{email}</strong></p>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          className="input"
          placeholder="Enter OTP"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
      <button
        type="button"
        onClick={handleResend}
        style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', marginLeft: 12, fontSize: 14 }}
      >
        Resend OTP
      </button>
      {error && <div className="error">{error}</div>}
      {resendMsg && <div className="success">{resendMsg}</div>}
    </form>
  );
}

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setRole, setEmail: setAuthEmail } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      setAuthEmail(email);
      setRole('admin');
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="email"
          className="input"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="password"
          className="input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Logging in...' : 'Login as Admin'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  function handleEmailSuccess(submittedEmail) {
    setEmail(submittedEmail);
    setStep('otp');
  }

  function handleChangeEmail() {
    setEmail('');
    setStep('email');
  }

  return (
    <div className="container" style={{ paddingTop: 60 }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Digital Queue System</h1>
        <p style={{ color: '#666', fontSize: 14 }}>College Office Queue</p>
      </div>

      <div className="card">
        {step === 'email' && <EmailForm onSuccess={handleEmailSuccess} />}
        {step === 'otp' && <OtpForm email={email} onChangeEmail={handleChangeEmail} />}
      </div>

      <div className="card">
        <button
          type="button"
          onClick={() => setShowAdminLogin((v) => !v)}
          style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 14 }}
        >
          Admin Login
        </button>
        {showAdminLogin && (
          <div style={{ marginTop: 16 }}>
            <AdminLoginForm />
          </div>
        )}
      </div>
    </div>
  );
}
