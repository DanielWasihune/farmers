const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { logger } = require('../utils/logger');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    logger.warn('AuthMiddleware: No Authorization header provided');
    return res.status(401).json({ message: 'No Authorization header provided' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('AuthMiddleware: Invalid Authorization header format');
    return res.status(401).json({ message: 'Invalid Authorization header format, expected Bearer token' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    logger.warn('AuthMiddleware: Empty token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    logger.debug(`AuthMiddleware: Verifying token: ${token.substring(0, 10)}...`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(`AuthMiddleware: Token decoded: ${JSON.stringify(decoded)}`);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn(`AuthMiddleware: User not found for ID: ${decoded.id}`);
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    logger.info(`AuthMiddleware: User authenticated: ${user._id}`);
    next();
  } catch (error) {
    logger.error(`AuthMiddleware: Token verification failed: ${error.message}`, {
      token: token.substring(0, 10) + '...',
      errorStack: error.stack,
    });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Token verification failed' });
  }
});

module.exports = { protect };