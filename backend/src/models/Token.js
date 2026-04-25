const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenNumber:  { type: Number, required: true },
  studentEmail: { type: String, required: true },
  serviceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  roomCode:     { type: String, default: null },
  counterLabel: { type: String, default: null }, // e.g. "Counter A"
  status:       { type: String, enum: ['waiting', 'serving', 'done', 'missed'], default: 'waiting' },
  isSlotBooking: { type: Boolean, default: false }, // true if user had a valid slot booking when joining
  sortOrder:    { type: Number, default: null },     // used for priority sorting; null = use tokenNumber
  notificationsSent: { type: [Number], default: [] }, // tracks tokensAhead thresholds already notified
  startedServingAt: { type: Date, default: null },
  servedAt:     { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now }
});

tokenSchema.index({ serviceId: 1, status: 1, tokenNumber: 1 });
tokenSchema.index({ studentEmail: 1, status: 1 });
tokenSchema.index({ roomCode: 1, status: 1, tokenNumber: 1 });

module.exports = mongoose.model('Token', tokenSchema);
