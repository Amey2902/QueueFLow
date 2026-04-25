const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  slotId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  roomCode:     { type: String, required: true, uppercase: true },
  email:        { type: String, required: true },
  date:         { type: String, required: true }, // 'YYYY-MM-DD'
  createdAt:    { type: Date, default: Date.now }
});

bookingSchema.index({ slotId: 1, email: 1 }, { unique: true }); // one booking per slot per user
bookingSchema.index({ roomCode: 1, email: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
