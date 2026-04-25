const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const requireStudentAuth = require('../middleware/requireStudentAuth');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const requireParticipantAuth = require('../middleware/requireParticipantAuth');
const requireRoomInSession = require('../middleware/requireRoomInSession');

function requireAdminOrCounter(req, res, next) {
  if (req.session.role === 'admin' || req.session.role === 'organizer' || req.session.role === 'counter') return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Participant room status (must be before /:serviceId)
router.get('/room-status', requireParticipantAuth, async (req, res) => {
  try {
    const roomCode = req.session.roomCode;
    if (!roomCode) return res.status(403).json({ error: 'No room code associated with this session.' });
    const result = await queueService.getParticipantStatus(req.session.email, roomCode);
    res.json(result);
  } catch (err) {
    if (err.message === 'No active token found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Admin room queue routes
router.get('/room/:roomCode', requireAdminAuth, async (req, res) => {
  try {
    const result = await queueService.getRoomQueue(req.params.roomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Counter-specific next token endpoint
router.post('/counter/:roomCode/next', async (req, res) => {
  if (!['admin', 'organizer', 'counter'].includes(req.session.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const counterLabel = req.session.role === 'counter' ? req.session.counterLabel : null;
    const result = await queueService.advanceRoomQueue(req.params.roomCode, counterLabel);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/counter/:roomCode/skip', async (req, res) => {
  if (!['admin', 'organizer', 'counter'].includes(req.session.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const counterLabel = req.session.role === 'counter' ? req.session.counterLabel : null;
    const result = await queueService.skipCurrentToken(req.params.roomCode, counterLabel);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/counter/:roomCode/queue', async (req, res) => {
  if (!['admin', 'organizer', 'counter'].includes(req.session.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const counterLabel = req.session.role === 'counter' ? req.session.counterLabel : null;
    const Token = require('../models/Token');
    const query = { roomCode: req.params.roomCode.toUpperCase(), status: { $in: ['waiting', 'serving'] } };
    if (counterLabel) query.counterLabel = counterLabel;

    // Fix null sortOrders so slot-booked users sort correctly
    const nullTokens = await Token.find({ ...query, sortOrder: null });
    for (const t of nullTokens) {
      await Token.findByIdAndUpdate(t._id, { sortOrder: t.tokenNumber * 1000 });
    }

    const tokens = await Token.find(query).sort({ sortOrder: 1, tokenNumber: 1 });
    res.json(tokens.map(t => ({ tokenNumber: t.tokenNumber, studentEmail: t.studentEmail, status: t.status, counterLabel: t.counterLabel, isSlotBooking: t.isSlotBooking || false, sortOrder: t.sortOrder ?? t.tokenNumber * 1000 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/room/:roomCode/next', requireAdminOrCounter, async (req, res) => {
  try {
    const counterLabel = req.session.role === 'counter' ? req.session.counterLabel : null;
    const result = await queueService.advanceRoomQueue(req.params.roomCode, counterLabel);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/room/:roomCode/skip', requireAdminOrCounter, async (req, res) => {
  try {
    const result = await queueService.skipCurrentToken(req.params.roomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/room/:roomCode/reset', requireAdminAuth, async (req, res) => {
  try {
    const result = await queueService.resetRoomQueue(req.params.roomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', requireStudentAuth, async (req, res) => {
  try {
    const result = await queueService.getStudentStatus(req.session.email);
    res.json(result);
  } catch (err) {
    if (err.message === 'No active token found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:serviceId', requireAdminAuth, async (req, res) => {
  const result = await queueService.getQueueForService(req.params.serviceId);
  res.json(result);
});

router.post('/:serviceId/next', requireAdminAuth, async (req, res) => {
  const result = await queueService.advanceQueue(req.params.serviceId);
  res.json(result);
});

router.post('/:serviceId/reset', requireAdminAuth, async (req, res) => {
  const result = await queueService.resetQueue(req.params.serviceId);
  res.json(result);
});

module.exports = router;
