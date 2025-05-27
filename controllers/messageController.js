// controllers/messageController.js
const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Fetch messages between two users
const getMessages = asyncHandler(async (req, res) => {
  const { userId1, userId2 } = req.query;
  console.log('MessageController: Fetching messages for:', { userId1, userId2 });

  if (!userId1 || !userId2) {
    console.log('MessageController: Missing user IDs');
    return res.status(400).json({ message: 'Both userId1 and userId2 are required' });
  }

  const normalizedUserId1 = userId1.toLowerCase();
  const normalizedUserId2 = userId2.toLowerCase();

  const user1 = await User.findOne({ email: normalizedUserId1 });
  const user2 = await User.findOne({ email: normalizedUserId2 });
  if (!user1 || !user2) {
    console.log('MessageController: One or both users not found:', { userId1: normalizedUserId1, userId2: normalizedUserId2 });
    return res.status(400).json({ message: 'One or both users not found' });
  }

  // Sort participant IDs to ensure consistent conversation lookup
  const participants = [normalizedUserId1, normalizedUserId2].sort();
  const conversation = await Conversation.findOne({
    participants,
  }).lean();

  const messages = conversation ? conversation.messages : [];
  console.log(`MessageController: Found ${messages.length} messages between ${normalizedUserId1} and ${normalizedUserId2}`);
  res.status(200).json(messages);
});

// Debugging log to verify export
console.log('Exporting getMessages:', typeof getMessages);
module.exports = { getMessages };