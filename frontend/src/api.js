const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const organizerRegister = (name, email, password) =>
  request('/api/organizer/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });

export const organizerLogin = (email, password) =>
  request('/api/organizer/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const counterLogin = (email, password) =>
  request('/api/organizer/counter-login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const addCounter = (roomCode, label, email, password) =>
  request('/api/organizer/counters', { method: 'POST', body: JSON.stringify({ roomCode, label, email, password }) });

export const getCounters = (roomCode) =>
  request(`/api/organizer/counters/${roomCode}`);

export const deleteCounter = (counterId) =>
  request(`/api/organizer/counters/${counterId}`, { method: 'DELETE' });

export const joinRoom = (roomCode) =>
  request('/api/auth/join-room', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });

export const sendOtp = (email) =>
  request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const verifyOtp = (email, otp, roomCode = null) =>
  request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, ...(roomCode && { roomCode }) }),
  });

export const adminLogin = (email, password) =>
  request('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  request('/api/auth/logout', { method: 'POST' });

export const getServices = () =>
  request('/api/services');

export const generateToken = (serviceId) =>
  request('/api/tokens', {
    method: 'POST',
    body: JSON.stringify({ serviceId }),
  });

export const getActiveToken = () =>
  request('/api/tokens/active');

export const getQueueStatus = () =>
  request('/api/queue/status');

export const getAdminQueue = (serviceId) =>
  request(`/api/queue/${serviceId}`);

export const nextToken = (serviceId) =>
  request(`/api/queue/${serviceId}/next`, { method: 'POST' });

export const resetQueue = (serviceId) =>
  request(`/api/queue/${serviceId}/reset`, { method: 'POST' });

// Room code queue API
export const lookupRoom = (code) =>
  request(`/api/rooms/lookup?code=${encodeURIComponent(code)}`);

export const verifyOtpWithRoom = (email, otp, roomCode) =>
  request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, roomCode }),
  });

export const generateRoomToken = (roomCode = null) =>
  request('/api/tokens/room', {
    method: 'POST',
    body: JSON.stringify(roomCode ? { roomCode } : {}),
  });

export const getRoomStatus = () =>
  request('/api/queue/room-status');

export const createRoom = (name, avgServiceTimeMin) =>
  request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, avgServiceTimeMin }),
  });

export const listRooms = () =>
  request('/api/rooms');

export const getRoomQueue = (roomCode) =>
  request(`/api/queue/room/${roomCode}`);

export const skipRoomToken = (roomCode) =>
  request(`/api/queue/room/${roomCode}/skip`, { method: 'POST' });

export const resetRoomQueue = (roomCode) =>
  request(`/api/queue/room/${roomCode}/reset`, { method: 'POST' });

export const getAnalytics = (roomCode = null) =>
  request(`/api/analytics${roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : ''}`);

export const generateSlots = (roomCode, config) =>
  request('/api/slots/generate', { method: 'POST', body: JSON.stringify({ roomCode, ...config }) });

export const clearSlots = (roomCode) =>
  request('/api/slots/clear', { method: 'DELETE', body: JSON.stringify({ roomCode }) });

export const getSlots = (roomCode, date) =>
  request(`/api/slots/${encodeURIComponent(roomCode)}${date ? `?date=${date}` : ''}`);

export const bookSlot = (slotId, roomCode) =>
  request('/api/slots/book', { method: 'POST', body: JSON.stringify({ slotId, roomCode }) });

export const getMyBooking = (roomCode, date) =>
  request(`/api/slots/${encodeURIComponent(roomCode)}/my-booking${date ? `?date=${date}` : ''}`);

export const cancelMyBooking = (roomCode, date) =>
  request(`/api/slots/${encodeURIComponent(roomCode)}/my-booking${date ? `?date=${date}` : ''}`, { method: 'DELETE' });

export const disableSlot = (slotId) =>
  request(`/api/slots/${slotId}/disable`, { method: 'PATCH' });


export const advanceRoomQueue = (roomCode) =>
  request(`/api/queue/room/${roomCode}/next`, { method: 'POST' });

export const setRoomStatus = (roomCode, status) =>
  request(`/api/rooms/${roomCode}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteRoom = (roomCode) =>
  request(`/api/rooms/${roomCode}`, { method: 'DELETE' });

export const getMe = () => request('/api/auth/me');
