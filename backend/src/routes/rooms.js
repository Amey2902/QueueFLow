const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');
const requireAdminAuth = require('../middleware/requireAdminAuth');

// Public — validate room code before login
router.get('/lookup', async (req, res) => {
  try {
    const result = await roomService.lookupRoom(req.query.code);
    res.json({ roomName: result.roomName, status: result.status });
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Admin — create room
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const { name, avgServiceTimeMin } = req.body;
    const organizerId = req.session.organizerId || null;
    const result = await roomService.createRoom(name, avgServiceTimeMin, organizerId);
    res.status(201).json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Admin — list all rooms
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const organizerId = req.session.organizerId || null;
    const rooms = await roomService.listRooms(organizerId);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin — close or reopen room
router.patch('/:roomCode/status', requireAdminAuth, async (req, res) => {
  try {
    const result = await roomService.setRoomStatus(req.params.roomCode, req.body.status);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// Admin — delete room and all its tokens
router.delete('/:roomCode', requireAdminAuth, async (req, res) => {
  try {
    const Room = require('../models/Room');
    const Token = require('../models/Token');
    const room = await Room.findOneAndDelete({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await Token.deleteMany({ roomCode: req.params.roomCode.toUpperCase() });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
