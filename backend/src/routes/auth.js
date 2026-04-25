const { Router } = require('express');
const otpService = require('../services/otpService');
const authService = require('../services/authService');

const router = Router();

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    await otpService.sendOtp(email);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    if (err.message === 'Invalid email address') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[send-otp] SMTP error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp, roomCode } = req.body;
  try {
    const result = await authService.verifyOtp(email, otp, req.session, roomCode);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid or expired OTP') {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await authService.adminLogin(email, password, req.session);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid admin credentials') {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    await authService.logout(req.session);
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join-room', async (req, res) => {
  if (!req.session.role || req.session.role === 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { roomCode } = req.body;
  if (!roomCode) return res.status(400).json({ error: 'Room code required' });

  const Room = require('../models/Room');
  const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
  if (!room) return res.status(404).json({ error: 'Room not found. Please check your code and try again.' });
  if (room.status === 'closed') return res.status(410).json({ error: 'This queue is closed.' });

  req.session.role = 'participant';
  req.session.roomCode = room.roomCode;
  res.json({ roomCode: room.roomCode, roomName: room.name });
});


router.get('/me', (req, res) => {
  if (req.session.role) {
    res.json({
      role: req.session.role,
      email: req.session.email,
      roomCode: req.session.roomCode || null,
      counterLabel: req.session.counterLabel || null,
      counterId: req.session.counterId || null
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;
