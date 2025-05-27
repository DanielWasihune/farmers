const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { handleSocketEvents } = require('./controllers/socketHandlers');
const { CORS_CONFIG, SOCKET_CONFIG } = require('./config/constants');
const { logger } = require('./utils/logger');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: CORS_CONFIG,
    ...SOCKET_CONFIG,
  });

  io.use(async (socket, next) => {
    let token = socket.handshake.auth.token;
    logger.debug(`Socket.IO: Handshake attempt with token: ${token ? '[provided]' : '[missing]'}`);

    if (!token) {
      logger.warn('Socket.IO: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '').trim();
    }

    if (!token) {
      logger.warn('Socket.IO: Empty token after parsing');
      return next(new Error('Authentication error: Empty token provided'));
    }

    try {
      logger.debug(`Socket.IO: Verifying token: ${token.substring(0, 10)}...`);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.debug(`Socket.IO: Token decoded: ${JSON.stringify(decoded)}`);

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        logger.warn(`Socket.IO: User not found for ID: ${decoded.id}`);
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = { _id: user._id, email: user.email };
      socket.userId = user.email; // Set userId for backward compatibility
      logger.info(`Socket.IO: Authenticated user: ${user.email} (${user._id})`);
      next();
    } catch (error) {
      logger.error(`Socket.IO: Authentication error: ${error.message}`, {
        token: token.substring(0, 10) + '...',
        errorStack: error.stack,
      });
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication error: Invalid token'));
      }
      return next(new Error('Authentication error: Token verification failed'));
    }
  });

  handleSocketEvents(io);

  return io;
};

module.exports = { initializeSocket };