const express = require('express');
const router = express.Router();
const Organizer = require('../models/Organizer');
const Counter = require('../models/Counter');
const Room = require('../models/Room');

function requireOrganizerAuth(req, res, next) {
  if (req.session.role === 'organizer') return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Register organizer
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await Organizer.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const organizer = await Organizer.create({ name, email, password });
    req.session.role = 'organizer';
    req.session.email = organizer.email;
    req.session.organizerId = organizer._id.toString();
    req.session.organizerName = organizer.name;
    res.status(201).json({ role: 'organizer', email: organizer.email, name: organizer.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login organizer
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const organizer = await Organizer.findOne({ email: email.toLowerCase() });
    if (!organizer || !(await organizer.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.role = 'organizer';
    req.session.email = organizer.email;
    req.session.organizerId = organizer._id.toString();
    req.session.organizerName = organizer.name;
    res.json({ role: 'organizer', email: organizer.email, name: organizer.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Counter admin login
router.post('/counter-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const counter = await Counter.findOne({ email: email.toLowerCase() });
    if (!counter || !(await counter.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.role = 'counter';
    req.session.email = counter.email;
    req.session.counterId = counter._id.toString();
    req.session.counterLabel = counter.label;
    req.session.roomCode = counter.roomCode;
    res.json({ role: 'counter', email: counter.email, label: counter.label, roomCode: counter.roomCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add counter to a room (organizer only)
router.post('/counters', requireOrganizerAuth, async (req, res) => {
  try {
    const { roomCode, label, email, password } = req.body;
    if (!roomCode || !label || !email || !password) {
      return res.status(400).json({ error: 'roomCode, label, email and password required' });
    }
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const counter = await Counter.create({
      roomCode: roomCode.toUpperCase(),
      organizerId: req.session.organizerId,
      label,
      email,
      password
    });
    res.status(201).json({ label: counter.label, email: counter.email, roomCode: counter.roomCode });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

// Get counters for a room
router.get('/counters/:roomCode', requireOrganizerAuth, async (req, res) => {
  try {
    const counters = await Counter.find({ roomCode: req.params.roomCode.toUpperCase() }, '-password');
    res.json(counters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a counter
router.delete('/counters/:counterId', requireOrganizerAuth, async (req, res) => {
  try {
    await Counter.findByIdAndDelete(req.params.counterId);
    res.json({ message: 'Counter deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
