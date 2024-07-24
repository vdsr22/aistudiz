const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudySession', StudySessionSchema);