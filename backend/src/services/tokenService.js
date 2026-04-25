const Token = require('../models/Token');
const Service = require('../models/Service');
const Room = require('../models/Room');

async function generateToken(studentEmail, serviceId) {
  const existing = await Token.findOne({ studentEmail, status: { $in: ['waiting', 'serving'] } });
  if (existing) throw new Error('You already have an active token');

  const service = await Service.findByIdAndUpdate(
    serviceId,
    { $inc: { currentTokenSeq: 1 } },
    { new: true }
  );
  if (!service) throw new Error('Service not found');

  const token = await Token.create({
    tokenNumber: service.currentTokenSeq,
    studentEmail,
    serviceId,
    status: 'waiting'
  });

  return { tokenNumber: token.tokenNumber, serviceName: service.name };
}

const WALK_INS_AHEAD_OF_SLOT = 2; // keep this many walk-ins ahead of slot-booked users

async function getActiveToken(studentEmail) {
  return Token.findOne({ studentEmail, status: { $in: ['waiting', 'serving'] } }).populate('serviceId');
}

async function getSlotPrioritySortOrder(roomCode, excludeId = null, slotStartTime = null) {
  if (!slotStartTime) return 0;

  // sortOrder scheme (per slot window):
  //   windowBase = minutes-since-midnight of slot start * 10000
  //   slot users:  windowBase + 1, +2, +3...       (first in their window)
  //   walk-ins:    windowBase + 5000 + seq          (after slot users, before next window)
  //
  // This means:
  //   9:00 slot users  → 540*10000 + 1..n   = 5400001..
  //   9:00 walk-ins    → 540*10000 + 5000+n = 5405000..
  //   10:00 slot users → 600*10000 + 1..n   = 6000001..
  //   10:00 walk-ins   → 600*10000 + 5000+n = 6005000..

  const slotDate = new Date(slotStartTime);
  const minutesSinceMidnight = slotDate.getHours() * 60 + slotDate.getMinutes();
  const windowBase = minutesSinceMidnight * 10000;

  // Find last slot user already in this window
  const lastSlotInWindow = await Token.findOne({
    roomCode: roomCode.toUpperCase(),
    status: 'waiting',
    isSlotBooking: true,
    sortOrder: { $gte: windowBase, $lt: windowBase + 5000 },
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).sort({ sortOrder: -1 });

  if (lastSlotInWindow) {
    return lastSlotInWindow.sortOrder + 1;
  }
  return windowBase + 1;
}

// Get sortOrder for a walk-in based on current time (which slot window they fall into)
async function getWalkInSortOrder(roomCode, tokenSeq) {
  const Slot = require('../models/Slot');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Find the active slot window right now
  const activeSlot = await Slot.findOne({
    roomCode: roomCode.toUpperCase(),
    date: today,
    startTime: { $lte: now },
    endTime: { $gt: now },
    disabled: { $ne: true }
  });

  if (!activeSlot) {
    // No active slot window.
    // If current time is BEFORE any slot window starts today, this is a pre-window walk-in
    // → use simple sequential order (they arrived early, they stay at the front)
    const now2 = new Date();
    const firstSlotToday = await Slot.findOne({
      roomCode: roomCode.toUpperCase(),
      date: today,
      disabled: { $ne: true }
    }).sort({ startTime: 1 });

    if (firstSlotToday && now2 < firstSlotToday.startTime) {
      // Before first slot of the day → pre-window walk-in → simple sequential
      return tokenSeq * 1000;
    }

    // After slots have started/expired — check if any slot-window tokens exist
    const lastSlotWindowToken = await Token.findOne({
      roomCode: roomCode.toUpperCase(),
      status: { $in: ['waiting', 'serving'] },
      sortOrder: { $gte: 10000 }
    }).sort({ sortOrder: -1 });

    if (lastSlotWindowToken) {
      const lastWalkInAfterSlots = await Token.findOne({
        roomCode: roomCode.toUpperCase(),
        status: { $in: ['waiting', 'serving'] },
        isSlotBooking: { $ne: true },
        sortOrder: { $gt: lastSlotWindowToken.sortOrder }
      }).sort({ sortOrder: -1 });

      if (lastWalkInAfterSlots) return lastWalkInAfterSlots.sortOrder + 1000;
      return lastSlotWindowToken.sortOrder + 1000;
    }

    return tokenSeq * 1000;
  }

  // Walk-in during a slot window → goes after slot users in this window
  const slotDate = new Date(activeSlot.startTime);
  const minutesSinceMidnight = slotDate.getHours() * 60 + slotDate.getMinutes();
  console.log(`[getWalkInSortOrder] activeSlot startTime=${activeSlot.startTime} localHours=${slotDate.getHours()} localMin=${slotDate.getMinutes()} minutesSinceMidnight=${minutesSinceMidnight}`);
  const windowBase = minutesSinceMidnight * 10000;
  const walkInBase = windowBase + 5000;

  // Find last walk-in already in this window
  const lastWalkInInWindow = await Token.findOne({
    roomCode: roomCode.toUpperCase(),
    status: 'waiting',
    isSlotBooking: { $ne: true },
    sortOrder: { $gte: walkInBase, $lt: walkInBase + 4999 }
  }).sort({ sortOrder: -1 });

  if (lastWalkInInWindow) {
    return lastWalkInInWindow.sortOrder + 1;
  }
  return walkInBase + 1;
}
async function generateRoomToken(email, roomCode) {
  // Check across ALL rooms for any active token
  const existing = await Token.findOne({
    studentEmail: email,
    status: { $in: ['waiting', 'serving'] }
  });
  if (existing) throw new Error('You already have an active token');

  const room = await Room.findOneAndUpdate(
    { roomCode: roomCode.toUpperCase() },
    { $inc: { currentTokenSeq: 1 } },
    { new: true }
  );
  if (!room) throw new Error('Room not found');

  // Check if user has a slot booking for today → gets priority regardless of current time
  const Booking = require('../models/Booking');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const booking = await Booking.findOne({ email, roomCode: roomCode.toUpperCase(), date: today });
  const isSlotBooking = !!booking;

  // Get slot start time for fair ordering
  let slotStartTime = null;
  if (booking) {
    const Slot = require('../models/Slot');
    const slot = await Slot.findById(booking.slotId);
    if (slot) slotStartTime = slot.startTime;
  }

  // Slot-booked users get priority via sortOrder, not by shifting token numbers
  // Assign counter round-robin if counters exist
  const Counter = require('../models/Counter');
  const counters = await Counter.find({ roomCode: roomCode.toUpperCase() }).sort({ label: 1 });
  let counterLabel = null;
  if (counters.length > 0) {
    const idx = (room.currentTokenSeq - 1) % counters.length;
    counterLabel = counters[idx].label;
  }

  let sortOrder = await getWalkInSortOrder(roomCode, room.currentTokenSeq);
  if (isSlotBooking) {
    sortOrder = await getSlotPrioritySortOrder(roomCode, null, slotStartTime);
  }

  const token = await Token.create({
    tokenNumber: room.currentTokenSeq,
    studentEmail: email,
    roomCode: room.roomCode,
    counterLabel,
    isSlotBooking,
    sortOrder,
    status: 'waiting'
  });

  return { tokenNumber: token.tokenNumber, roomName: room.name, roomCode: room.roomCode, counterLabel, isSlotBooking };
}

module.exports = { generateToken, getActiveToken, generateRoomToken, getSlotPrioritySortOrder, getWalkInSortOrder };
