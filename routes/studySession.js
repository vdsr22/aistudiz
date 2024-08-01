const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: function() { return !this.guestId; }
  },
  guestId: {
    type: String,
    required: function() { return !this.userId; }
  },
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  fileContent: {
    type: String
  },
  summary: {
    type: String
  },
  questions: [{
    question: String,
    options: [String],
    answer: String
  }],
  fileId: {
    type: mongoose.Schema.Types.ObjectId
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
StudySessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
StudySessionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('StudySession', StudySessionSchema);