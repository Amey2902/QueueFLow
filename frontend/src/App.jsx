import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth Context
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const RoomDashboard = React.lazy(() => import('./pages/RoomDashboard'));
const JoinQueue = React.lazy(() => import('./pages/JoinQueue'));
const CounterDashboard = React.lazy(() => import('./pages/CounterDashboard'));

function ProtectedStudent({ children }) {
  const { role } = useAuth();
  if (role !== 'student') return <Navigate to="/" replace />;
  return children;
}

function ProtectedAdmin({ children }) {
  const { role } = useAuth();
  if (role !== 'admin' && role !== 'organizer') return <Navigate to="/" replace />;
  return children;
}

function ProtectedCounter({ children }) {
  const { role } = useAuth();
  if (role !== 'counter') return <Navigate to="/" replace />;
  return children;
}

function ProtectedParticipant({ children }) {
  const { role } = useAuth();
  if (role !== 'participant' && role !== 'user') return <Navigate to="/" replace />;
  return children;
}

function ProtectedUser({ children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'participant') return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { role, roomCode } = useAuth();
  if (role === 'student' || role === 'user') return <Navigate to="/join" replace />;
  if (role === 'admin' || role === 'organizer') return <Navigate to="/admin" replace />;
  if (role === 'participant' && roomCode) return <Navigate to={`/room/${roomCode}`} replace />;
  if (role === 'participant') return <Navigate to="/join" replace />;
  if (role === 'counter' && roomCode) return <Navigate to={`/counter/${roomCode}`} replace />;
  return children;
}

function AppRoutes() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/join" element={<ProtectedUser><JoinQueue /></ProtectedUser>} />
        <Route path="/dashboard" element={<ProtectedStudent><StudentDashboard /></ProtectedStudent>} />
        <Route path="/admin" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
        <Route path="/room/:roomCode" element={<ProtectedParticipant><RoomDashboard /></ProtectedParticipant>} />
        <Route path="/counter/:roomCode" element={<ProtectedCounter><CounterDashboard /></ProtectedCounter>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasRestoredRef = React.useRef(false);

  // Restore session on page load (only once)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.role) {
          setRole(d.role);
          setEmail(d.email);
          if (d.roomCode) setRoomCode(d.roomCode);
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, []);

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--surface)' }} />;
  return (
    <AuthContext.Provider value={{ role, email, setRole, setEmail, roomCode, setRoomCode }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
