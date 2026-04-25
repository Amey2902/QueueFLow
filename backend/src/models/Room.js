const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name:              { type: String, required: true, maxlength: 100 },
  roomCode:          { type: String, required: true, unique: true, uppercase: true },
  avgServiceTimeMin: { type: Number, required: true, min: 1, max: 120 },
  currentTokenSeq:   { type: Number, default: 0 },
  status:            { type: String, enum: ['active', 'closed'], default: 'active' },
  organizerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', default: null },
  createdAt:         { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
