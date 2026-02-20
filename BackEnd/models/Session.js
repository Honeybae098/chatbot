import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  userAgent: {
    type: String
  }
});

sessionSchema.index({ lastActivity: -1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;

