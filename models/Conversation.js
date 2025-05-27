const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, required: true },
  messageId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
});

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 2,
      message: 'Conversation must have exactly two participants',
    },
  },
  messages: [messageSchema],
}, { timestamps: true });

// Index for faster retrieval by participants
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);