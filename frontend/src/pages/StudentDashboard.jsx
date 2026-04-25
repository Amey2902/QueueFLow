import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { logout, getServices, generateToken, getActiveToken, getQueueStatus } from '../api';

function LogoutButton({ setRole, setEmail }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } catch (_) {
      // ignore errors on logout
    }
    setRole(null);
    setEmail(null);
    navigate('/');
  }

  return (
    <button className="btn btn-danger" onClick={handleLogout}>
      Logout
    </button>
  );
}

function ServiceList({ onTokenGenerated }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenLoading, setTokenLoading] = useState({});
  const [tokenErrors, setTokenErrors] = useState({});

  useEffect(() => {
    getServices()
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load services.');
        setLoading(false);
      });
  }, []);

  async function handleGetToken(service) {
    setTokenLoading((prev) => ({ ...prev, [service._id]: true }));
    setTokenErrors((prev) => ({ ...prev, [service._id]: null }));
    try {
      const tokenInfo = await generateToken(service._id);
      onTokenGenerated(tokenInfo);
    } catch (err) {
      setTokenErrors((prev) => ({ ...prev, [service._id]: err.message || 'Failed to generate token.' }));
    } finally {
      setTokenLoading((prev) => ({ ...prev, [service._id]: false }));
    }
  }

  if (loading) return <p>Loading services...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      {services.map((service) => (
        <div key={service._id} className="card">
          <h3>{service.name}</h3>
          <p>Avg time: {service.avgServiceTimeMin} min</p>
          <button
            className="btn btn-primary"
            onClick={() => handleGetToken(service)}
            disabled={!!tokenLoading[service._id]}
            style={{ marginTop: '12px' }}
          >
            {tokenLoading[service._id] ? 'Getting Token...' : 'Get Token'}
          </button>
          {tokenErrors[service._id] && (
            <p className="error">{tokenErrors[service._id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TokenStatus({ tokenInfo }) {
  const [status, setStatus] = useState(null);
  const [pollError, setPollError] = useState(null);
  const consecutiveFailures = useRef(0);

  const statusRef = useRef(null);

  useEffect(() => {
    function poll() {
      if (statusRef.current && statusRef.current.status === 'done') return;
      getQueueStatus()
        .then((data) => {
          consecutiveFailures.current = 0;
          setPollError(null);
          setStatus(data);
          statusRef.current = data;
        })
        .catch((err) => {
          // 404 means no active token — token is done
          if (err.message && (err.message.includes('404') || err.message.includes('No active'))) {
            statusRef.current = { ...statusRef.current, status: 'done' };
            setStatus(prev => prev ? { ...prev, status: 'done' } : null);
            return;
          }
          consecutiveFailures.current += 1;
          if (consecutiveFailures.current >= 3) {
            setPollError('Unable to fetch queue status. Please wait...');
          }
        });
    }

    poll();
    const interval = setInterval(poll, 5000);

    return () => clearInterval(interval);
  }, []);

  const display = status || tokenInfo;

  return (
    <div className="card">
      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        Your Token: #{display.tokenNumber}
      </p>
      <p>Service: {display.serviceName}</p>
      <p>Currently Serving: #{status ? (status.currentlyServingToken || 'None') : 'None'}</p>
      <p>People Ahead: {status ? status.tokensAhead : '—'}</p>
      <p>Estimated Wait: {status ? status.estimatedWaitTimeMin : '—'} min</p>
      <span className={`badge badge-${display.status || 'waiting'}`}>
        {display.status || 'waiting'}
      </span>

      {status && status.tokensAhead <= 1 && status.status === 'waiting' && (
        <p className="success">Your turn is near!</p>
      )}
      {status && status.status === 'serving' && (
        <p className="success">It's your turn now!</p>
      )}
      {status && status.status === 'done' && (
        <p className="success">Your token has been completed.</p>
      )}

      {pollError && status && status.status !== 'serving' && status.status !== 'done' && <p className="error">{pollError}</p>}
    </div>
  );
}

export default function StudentDashboard() {
  const { email, setRole, setEmail } = useAuth();
  const [activeToken, setActiveToken] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getActiveToken()
      .then((data) => {
        if (data && data.tokenNumber) {
          setActiveToken(data);
        }
      })
      .catch(() => {
        // no active token or error — show service list
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Welcome, {email}</h2>
        <LogoutButton setRole={setRole} setEmail={setEmail} />
      </div>

      {activeToken ? (
        <TokenStatus tokenInfo={activeToken} />
      ) : (
        <ServiceList onTokenGenerated={(token) => setActiveToken(token)} />
      )}
    </div>
  );
}
