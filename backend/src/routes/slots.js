const express = require('express');
const router = express.Router();
const { generateSlots, clearSlots, getSlots, bookSlot, getUserBooking, cancelBooking } = require('../services/slotService');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const requireParticipantAuth = require('../middleware/requireParticipantAuth');

// Admin: generate slots for a room
router.post('/generate', requireAdminAuth, async (req, res) => {
  try {
    const { roomCode, slotDurationMin, maxCapacity, startHour, endHour, date } = req.body;
    if (!roomCode || !slotDurationMin || !maxCapacity) {
      return res.status(400).json({ error: 'roomCode, slotDurationMin, and maxCapacity are required' });
    }
    const count = await generateSlots(roomCode, { slotDurationMin, maxCapacity, startHour, endHour, date });
    res.json({ message: `Generated ${count} slots`, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: clear all slots for a room today
router.delete('/clear', requireAdminAuth, async (req, res) => {
  try {
    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'roomCode required' });
    const result = await clearSlots(roomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get slots for a room
router.get('/:roomCode', async (req, res) => {
  try {
    if (!req.session.role) return res.status(401).json({ error: 'Unauthorized' });
    const { date } = req.query;
    const slots = await getSlots(req.params.roomCode, date);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Participant: book a slot
router.post('/book', requireParticipantAuth, async (req, res) => {
  try {
    const { slotId, roomCode } = req.body;
    if (!slotId || !roomCode) return res.status(400).json({ error: 'slotId and roomCode required' });
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ error: 'Invalid slot ID' });
    }
    const result = await bookSlot(slotId, req.session.email, roomCode);
    const slot = result.slot;
    const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const { sendQueueEmail } = require('../services/notificationService');
    sendQueueEmail(
      req.session.email,
      `Slot Booking Confirmed — ${roomCode}`,
      `Hi,\n\nYour slot has been booked!\n\nRoom: ${roomCode}\nDate: ${slot.date}\nTime: ${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}\n\nPlease arrive on time.\n\nQueueFlow`
    ).catch(() => {});
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Participant: get their booking for today
router.get('/:roomCode/my-booking', requireParticipantAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const booking = await getUserBooking(req.session.email, req.params.roomCode, date);
    res.json(booking || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Participant: cancel booking
router.delete('/:roomCode/my-booking', requireParticipantAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const booking = await cancelBooking(req.session.email, req.params.roomCode, date);
    if (!booking) return res.status(404).json({ error: 'No booking found' });
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: disable a specific slot
router.patch('/:slotId/disable', requireAdminAuth, async (req, res) => {
  try {
    const Slot = require('../models/Slot');
    const slot = await Slot.findByIdAndUpdate(req.params.slotId, { disabled: true }, { new: true });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json({ message: 'Slot disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
