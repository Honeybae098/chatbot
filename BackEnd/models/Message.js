import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  model: {
    type: String,
    default: 'deepseek-r1'
  }
});

// Index for faster queries
messageSchema.index({ sessionId: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;

