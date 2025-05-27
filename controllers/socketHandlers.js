const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { getUsers, setUser, removeUser } = require('../utils/users');
const { logger } = require('../utils/logger');

const handleSocketEvents = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user?.email;
    if (!userId) {
      logger.warn('Socket.IO: Invalid user ID', { socketUser: socket.user });
      socket.emit('error', { message: 'Invalid user ID' });
      socket.disconnect();
      return;
    }

    const users = getUsers();
    if (users[userId]) {
      io.to(users[userId]).emit('forceDisconnect', { message: 'New session detected' });
      logger.info(`Socket.IO: Disconnecting old session for ${userId}`);
    }
    setUser(userId, socket.id);
    User.findOneAndUpdate({ email: userId }, { online: true }, { new: true })
      .then(() => {
        logger.info(`Socket.IO: User ${userId} online`);
        io.emit('userOnline', { email: userId });

        // Deliver undelivered messages to the newly online user
        Conversation.find({
          participants: userId,
          'messages.delivered': false,
          'messages.receiverId': userId,
        })
          .then((conversations) => {
            conversations.forEach(async (conv) => {
              try {
                const undeliveredMessages = conv.messages.filter(
                  (msg) => msg.receiverId === userId && !msg.delivered
                );
                for (const msg of undeliveredMessages) {
                  // Explicitly set read: false to ensure messages are unread
                  socket.emit('receiveMessage', { ...msg.toObject(), read: false });
                  await Conversation.updateOne(
                    { _id: conv._id, 'messages.messageId': msg.messageId },
                    { $set: { 'messages.$.delivered': true } }
                  );
                  logger.info(`Socket.IO: Delivered message ${msg.messageId} to ${userId}`);
                  const senderSocketId = users[msg.senderId];
                  if (senderSocketId) {
                    io.to(senderSocketId).emit('messageDelivered', { messageId: msg.messageId });
                    logger.info(`Socket.IO: Notified ${msg.senderId} of delivery for message ${msg.messageId}`);
                  }
                }
              } catch (e) {
                logger.error(`Socket.IO: Error processing undelivered messages for conversation ${conv._id}:`, e.stack);
              }
            });
          })
          .catch((e) => logger.error('Socket.IO: Error fetching undelivered messages on user online:', e.stack));
      })
      .catch((e) => logger.error('Socket.IO: Error updating user online status:', e.stack));

    socket.emit('registered', { userId });
    logger.info(`Socket.IO: User ${userId} connected. Users:`, Object.keys(users));

    // Handle client register event
    socket.on('register', (clientUserId) => {
      if (clientUserId !== userId) {
        logger.warn(`Socket.IO: Client registration userId mismatch: expected ${userId}, got ${clientUserId}`);
        socket.emit('error', { message: 'User ID mismatch' });
        socket.disconnect();
        return;
      }
      logger.info(`Socket.IO: Client registered for ${clientUserId}`);
    });

    socket.on('sendMessage', async ({ senderId, receiverId, message, messageId }) => {
      try {
        if (!senderId || !receiverId || !message || !messageId) {
          socket.emit('error', { message: 'Invalid message data' });
          logger.warn(`Socket.IO: Invalid message data:`, { senderId, receiverId, message, messageId });
          return;
        }
        if (senderId !== userId) {
          socket.emit('error', { message: 'Sender ID mismatch' });
          logger.warn(`Socket.IO: Sender ID mismatch: expected ${userId}, got ${senderId}`);
          return;
        }
        const receiver = await User.findOne({ email: receiverId });
        if (!receiver) {
          socket.emit('error', { message: 'Recipient not found' });
          logger.warn(`Socket.IO: Receiver ${receiverId} not found`);
          return;
        }
        const timestamp = new Date().toISOString();
        const messageData = {
          senderId,
          receiverId,
          message,
          messageId,
          timestamp,
          delivered: false,
          read: false,
        };

        const participants = [senderId, receiverId].sort();
        let conversation = await Conversation.findOne({ participants });
        if (!conversation) {
          conversation = new Conversation({ participants, messages: [] });
        }

        conversation.messages.push(messageData);
        await conversation.save();
        logger.info(`Socket.IO: Saved message ${messageId} from ${senderId} to ${receiverId}`);

        const receiverSocketId = users[receiverId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', messageData);
          await Conversation.updateOne(
            { _id: conversation._id, 'messages.messageId': messageId },
            { $set: { 'messages.$.delivered': true } }
          );
          logger.info(`Socket.IO: Delivered message ${messageId} to ${receiverId}`);
          io.to(socket.id).emit('messageDelivered', { messageId });
          logger.info(`Socket.IO: Notified ${senderId} of delivery for message ${messageId}`);
        } else {
          logger.info(`Socket.IO: Receiver ${receiverId} offline, message ${messageId} stored in DB`);
        }
        socket.emit('messageSent', messageData);
      } catch (e) {
        logger.error('Socket.IO: Error sending message:', e.stack);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ senderId, receiverId }) => {
      if (senderId !== userId) {
        logger.warn(`Socket.IO: Typing sender ID mismatch: expected ${userId}, got ${senderId}`);
        return;
      }
      const receiverSocketId = users[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', { senderId });
        logger.info(`Socket.IO: Typing from ${senderId} to ${receiverId}`);
      }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      if (senderId !== userId) {
        logger.warn(`Socket.IO: Stop typing sender ID mismatch: expected ${userId}, got ${senderId}`);
        return;
      }
      const receiverSocketId = users[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStoppedTyping', { senderId });
        logger.info(`Socket.IO: Stop typing from ${senderId} to ${receiverId}`);
      }
    });

    socket.on('markAsRead', async ({ messageId }) => {
      try {
        const conversation = await Conversation.findOne({ 'messages.messageId': messageId });
        if (!conversation) {
          socket.emit('error', { message: 'Message not found' });
          logger.warn(`Socket.IO: Message ${messageId} not found for markAsRead`);
          return;
        }
        const message = conversation.messages.find((msg) => msg.messageId === messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          logger.warn(`Socket.IO: Message ${messageId} not found in conversation for markAsRead`);
          return;
        }
        if (message.receiverId !== userId) {
          socket.emit('error', { message: 'Unauthorized to mark message as read' });
          logger.warn(`Socket.IO: User ${userId} not authorized to mark message ${messageId} as read`);
          return;
        }
        if (message.read) {
          logger.info(`Socket.IO: Message ${messageId} already marked as read by ${userId}`);
          return;
        }
        await Conversation.updateOne(
          { 'messages.messageId': messageId },
          { $set: { 'messages.$.read': true } }
        );
        logger.info(`Socket.IO: Marked message ${messageId} as read by ${userId}`);
        const senderSocketId = users[message.senderId];
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageRead', { messageId });
          logger.info(`Socket.IO: Notified ${message.senderId} that message ${messageId} was read`);
        }
      } catch (e) {
        logger.error('Socket.IO: Error marking message as read:', e.stack);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('connect_error', (err) => {
      logger.error('Socket.IO: Client connection error:', err.stack);
      socket.emit('error', { message: 'Connection failed' });
    });

    socket.on('disconnect', async () => {
      if (socket.user?.email) {
        removeUser(socket.user.email);
        try {
          await User.findOneAndUpdate({ email: socket.user.email }, { online: false });
          logger.info(`Socket.IO: User ${socket.user.email} disconnected. Users:`, Object.keys(users));
          io.emit('userOffline', { email: socket.user.email });
        } catch (e) {
          logger.error('Socket.IO: Error updating user offline status:', e.stack);
        }
      }
    });
  });
};

const emitNewUser = (io, user) => {
  try {
    io.emit('newUser', {
      email: user.email,
      username: user.username,
      online: true,
      profilePicture: user.profilePicture || '',
    });
    logger.info(`Socket.IO: Emitted newUser event for ${user.email}`);
  } catch (e) {
    logger.error('Socket.IO: Error emitting newUser event:', e.stack);
  }
};

module.exports = { handleSocketEvents, emitNewUser };