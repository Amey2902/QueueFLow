const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { getSlotPrioritySortOrder } = require('./tokenService');

// Generate slots for a room for today
// startHour: 9 (9 AM), endHour: 17 (5 PM), slotDurationMin: 30, maxCapacity: 5
async function generateSlots(roomCode, { slotDurationMin, maxCapacity, startHour = 9, endHour = 17, date }) {
  // Use local date to avoid UTC offset issues
  const now = new Date();
  const targetDate = date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  await Slot.deleteMany({ roomCode: roomCode.toUpperCase(), date: targetDate });

  const slots = [];
  const [year, month, day] = targetDate.split('-').map(Number);

  const startHourInt = Math.floor(startHour);
  const startMin = Math.round((startHour - startHourInt) * 60);
  const endHourInt = Math.floor(endHour);
  const endMin = Math.round((endHour - endHourInt) * 60);

  console.log(`[generateSlots] startHour=${startHour} endHour=${endHour} → start=${startHourInt}:${startMin} end=${endHourInt}:${endMin}`);

  let current = new Date(year, month - 1, day, startHourInt, startMin, 0, 0);
  let end = new Date(year, month - 1, day, endHourInt, endMin, 0, 0);

  // Handle midnight crossover (e.g. 11 PM → 12 AM next day)
  if (end <= current) {
    end = new Date(year, month - 1, day + 1, endHourInt, endMin, 0, 0);
  }

  while (current < end) {
    const slotEnd = new Date(current.getTime() + slotDurationMin * 60000);
    slots.push({
      roomCode: roomCode.toUpperCase(),
      startTime: new Date(current),
      endTime: slotEnd,
      maxCapacity,
      bookedCount: 0,
      date: targetDate
    });
    current = slotEnd;
  }

  await Slot.insertMany(slots);
  return slots.length;
}

async function clearSlots(roomCode, date) {
  const now = new Date();
  const targetDate = date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  await Slot.deleteMany({ roomCode: roomCode.toUpperCase(), date: targetDate });
  // Also clear bookings for that date
  await Booking.deleteMany({ roomCode: roomCode.toUpperCase(), date: targetDate });
  return { message: 'Slots cleared' };
}

async function getSlots(roomCode, date) {
  const now = new Date();
  const targetDate = date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return Slot.find({ roomCode: roomCode.toUpperCase(), date: targetDate }).sort({ startTime: 1 });
}

async function bookSlot(slotId, email, roomCode) {
  const s = await Slot.findById(slotId);
  if (!s) throw Object.assign(new Error('Slot not found'), { statusCode: 404 });
  if (s.disabled) throw Object.assign(new Error('This slot has been disabled'), { statusCode: 400 });
  if (s.bookedCount >= s.maxCapacity) throw Object.assign(new Error('This slot is full'), { statusCode: 400 });

  // Check if user already has a booking for this room today
  const existing = await Booking.findOne({ email, roomCode: roomCode.toUpperCase(), date: s.date });
  if (existing) throw Object.assign(new Error('You already have a booking for this date'), { statusCode: 400 });

  // Atomically increment
  const updated = await Slot.findOneAndUpdate(
    { _id: slotId, bookedCount: { $lt: s.maxCapacity } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error('This slot is full'), { statusCode: 400 });

  try {
    const booking = await Booking.create({ slotId, roomCode: roomCode.toUpperCase(), email, date: s.date });

    // If user already has a waiting token, upgrade it to priority now that they've booked
    {
      const Token = require('../models/Token');
      const existingToken = await Token.findOne({
        studentEmail: email,
        roomCode: roomCode.toUpperCase(),
        status: 'waiting',
        isSlotBooking: { $ne: true }
      });
      if (existingToken) {
        // Find lowest sortOrder among all waiting walk-ins
        const lowestWalkIn = await Token.findOne({
          roomCode: roomCode.toUpperCase(),
          status: 'waiting',
          isSlotBooking: { $ne: true },
          _id: { $ne: existingToken._id }
        }).sort({ sortOrder: 1, tokenNumber: 1 });

        // Use tokenNumber-based fallback if sortOrder is null
        const lowestOrder = lowestWalkIn
          ? (lowestWalkIn.sortOrder ?? lowestWalkIn.tokenNumber * 1000)
          : (existingToken.sortOrder ?? existingToken.tokenNumber * 1000);

        const slotSortOrder = await getSlotPrioritySortOrder(roomCode, existingToken._id, s.startTime);
        const currentOrder = existingToken.sortOrder ?? existingToken.tokenNumber * 1000;

        // Always move to the slot's window position — booking a slot means
        // you're expected at that time, so you get placed in that window.
        const newSortOrder = slotSortOrder;

        await Token.findByIdAndUpdate(existingToken._id, {
          isSlotBooking: true,
          sortOrder: newSortOrder,
          notificationsSent: []
        });
      }
    }

    return { booking, slot: updated };
  } catch (err) {
    await Slot.findByIdAndUpdate(slotId, { $inc: { bookedCount: -1 } });
    if (err.code === 11000) throw Object.assign(new Error('You already have a booking for this slot'), { statusCode: 400 });
    throw err;
  }
}

async function getUserBooking(email, roomCode, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const booking = await Booking.findOne({ email, roomCode: roomCode.toUpperCase(), date: targetDate }).populate('slotId');
  return booking;
}

async function cancelBooking(email, roomCode, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const booking = await Booking.findOneAndDelete({ email, roomCode: roomCode.toUpperCase(), date: targetDate });
  if (booking) {
    await Slot.findByIdAndUpdate(booking.slotId, { $inc: { bookedCount: -1 } });

    // Downgrade the user's active token back to a walk-in
    const Token = require('../models/Token');
    const { getWalkInSortOrder } = require('./tokenService');
    const token = await Token.findOne({
      studentEmail: email,
      roomCode: roomCode.toUpperCase(),
      status: { $in: ['waiting', 'serving'] },
      isSlotBooking: true
    });
    if (token) {
      const newSortOrder = await getWalkInSortOrder(roomCode, token.tokenNumber);
      await Token.findByIdAndUpdate(token._id, {
        isSlotBooking: false,
        sortOrder: newSortOrder
      });
    }
  }
  return booking;
}

module.exports = { generateSlots, clearSlots, getSlots, bookSlot, getUserBooking, cancelBooking };
