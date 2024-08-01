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
  fileName: {
    type: String
  },
  processedData: {
    type: String
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

StudySessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

StudySessionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('StudySession', StudySessionSchema);