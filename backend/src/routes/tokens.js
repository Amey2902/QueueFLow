const express = require('express');
const router = express.Router();
const tokenService = require('../services/tokenService');
const requireStudentAuth = require('../middleware/requireStudentAuth');
const requireParticipantAuth = require('../middleware/requireParticipantAuth');
const requireRoomInSession = require('../middleware/requireRoomInSession');

router.post('/', requireStudentAuth, async (req, res) => {
  try {
    const result = await tokenService.generateToken(req.session.email, req.body.serviceId);
    res.json(result);
  } catch (err) {
    if (err.message === 'You already have an active token') return res.status(400).json({ error: err.message });
    if (err.message === 'Service not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', requireStudentAuth, async (req, res) => {
  const token = await tokenService.getActiveToken(req.session.email);
  res.json(token || { token: null });
});

router.post('/room', requireParticipantAuth, async (req, res) => {
  try {
    // roomCode can come from session (participant flow) or body (user flow after login)
    const roomCode = req.session.roomCode || req.body.roomCode;
    if (!roomCode) return res.status(400).json({ error: 'No room code provided' });

    // If roomCode not in session yet, validate and store it
    if (!req.session.roomCode) {
      const Room = require('../models/Room');
      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (room.status === 'closed') return res.status(410).json({ error: 'This queue is closed.' });
      req.session.roomCode = room.roomCode;
    }

    const result = await tokenService.generateRoomToken(req.session.email, req.session.roomCode);
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'You already have an active token') return res.status(400).json({ error: err.message });
    if (err.message === 'Room not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Leave queue — marks active token as done and cancels any slot booking
router.delete('/room/leave', requireParticipantAuth, async (req, res) => {
  try {
    const email = req.session.email;
    const roomCode = req.session.roomCode;
    if (!roomCode) return res.status(400).json({ error: 'No room code in session' });

    const Token = require('../models/Token');
    const token = await Token.findOneAndUpdate(
      { studentEmail: email, roomCode: roomCode.toUpperCase(), status: { $in: ['waiting', 'serving'] } },
      { status: 'done', servedAt: new Date() },
      { new: true }
    );
    if (!token) return res.status(404).json({ error: 'No active token found' });

    // Cancel slot booking if exists
    const { cancelBooking } = require('../services/slotService');
    await cancelBooking(email, roomCode).catch(() => {});

    res.json({ message: 'You have left the queue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
