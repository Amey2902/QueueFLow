const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const counterSchema = new mongoose.Schema({
  roomCode:    { type: String, required: true, uppercase: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  label:       { type: String, required: true }, // e.g. "Counter A", "Window 2"
  email:       { type: String, required: true, lowercase: true },
  password:    { type: String, required: true },
  createdAt:   { type: Date, default: Date.now }
});

counterSchema.index({ roomCode: 1 });
counterSchema.index({ email: 1 }, { unique: true });

counterSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

counterSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Counter', counterSchema);
