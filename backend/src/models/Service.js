const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:              { type: String, required: true, unique: true },
  avgServiceTimeMin: { type: Number, required: true, default: 5 },
  currentTokenSeq:   { type: Number, default: 0 }
});

module.exports = mongoose.model('Service', serviceSchema);
