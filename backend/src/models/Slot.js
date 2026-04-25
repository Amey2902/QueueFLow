const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  roomCode:     { type: String, required: true, uppercase: true },
  startTime:    { type: Date, required: true },   // e.g. 2024-04-03T09:00:00
  endTime:      { type: Date, required: true },   // startTime + slotDurationMin
  maxCapacity:  { type: Number, required: true },
  bookedCount:  { type: Number, default: 0 },
  date:         { type: String, required: true }, // 'YYYY-MM-DD' for easy querying
  disabled:     { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

slotSchema.index({ roomCode: 1, date: 1 });

module.exports = mongoose.model('Slot', slotSchema);
