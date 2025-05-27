const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');
require('dotenv').config();

// Validate environment variables
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  logger.error('Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

// OTP storage (in-memory; use Redis for production)
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Validate email format
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Emit new user event via Socket.IO
const emitNewUser = (io, user) => {
  io.emit('newUser', {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
};

// Signup
const signup = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !validateEmail(email) || !password) {
    return res.status(400).json({ message: 'Username, valid email, and password required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    logger.warn(`Signup failed: User exists - ${email}`);
    return res.status(400).json({ message: 'User already exists' });
  }

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), {
    otp,
    expires: Date.now() + 10 * 60 * 1000,
    type: 'signup',
    user: { username, email: email.toLowerCase(), password: await bcrypt.hash(password, 10), role: role || 'user' },
  });

  const emailResult = await sendOTPEmail(email.toLowerCase(), username, otp, 'signup');
  if (!emailResult.success) {
    return res.status(500).json({ message: 'Failed to send OTP email' });
  }
  

  logger.info(`OTP sent for signup: ${email}`);
  res.status(200).json({ message: 'OTP sent to email', email });
});

// Verify OTP
const verifyOTP = asyncHandler(async (req, res, io) => {
  const { email, otp } = req.body;
  if (!validateEmail(email) || !otp) {
    return res.status(400).json({ message: 'Valid email and OTP required' });
  }

  const stored = otpStore.get(email.toLowerCase());
  if (!stored || stored.type !== 'signup' || stored.expires < Date.now() || stored.otp !== otp) {
    otpStore.delete(email.toLowerCase());
    logger.warn(`OTP verification failed: ${email}`);
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const { username, email: userEmail, password, role } = stored.user;
  const user = new User({ username, email: userEmail, password, role });
  await user.save();

  // Emit newUser event
  emitNewUser(io, user);
  logger.info(`User verified and created: ${userEmail}`);

  // Send welcome email
  const welcomeResult = await sendWelcomeEmail(userEmail, username);
  if (!welcomeResult.success) {
    logger.warn(`Failed to send welcome email to ${userEmail}: ${welcomeResult.message}`);
    // Note: Not failing the request, as welcome email is non-critical
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
  otpStore.delete(email.toLowerCase());

  res.status(201).json({
    user: { _id: user._id, username, email: userEmail, role },
    token,
  });
});

// Resend OTP
const resendOTP = asyncHandler(async (req, res) => {
  const { email, type } = req.body;
  if (!validateEmail(email) || !['signup', 'password_reset'].includes(type)) {
    return res.status(400).json({ message: 'Valid email and type (signup or password_reset) required' });
  }

  let username = 'User';
  if (type === 'signup') {
    const stored = otpStore.get(email.toLowerCase());
    if (!stored || stored.type !== 'signup') {
      return res.status(400).json({ message: 'No pending signup found' });
    }
    username = stored.user.username;
  } else {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    username = user.username;
  }

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), { otp, expires: Date.now() + 10 * 60 * 1000, type });

  const emailResult = await sendOTPEmail(email.toLowerCase(), username, otp, type);
  if (!emailResult.success) {
    return res.status(500).json({ message: 'Failed to send OTP email' });
  }

  logger.info(`OTP resent for ${type}: ${email}`);
  res.status(200).json({ message: 'New OTP sent', email });
});

// Request Password Reset
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Valid email required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), { otp, expires: Date.now() + 10 * 60 * 1000, type: 'password_reset' });

  const emailResult = await sendOTPEmail(email.toLowerCase(), user.username, otp, 'password_reset');
  if (!emailResult.success) {
    return res.status(500).json({ message: 'Failed to send OTP email' });
  }

  logger.info(`Password reset OTP sent: ${email}`);
  res.status(200).json({ message: 'OTP sent to email', email });
});

// Verify Password Reset OTP
const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!validateEmail(email) || !otp) {
    return res.status(400).json({ message: 'Valid email and OTP required' });
  }

  const stored = otpStore.get(email.toLowerCase());
  if (!stored || stored.type !== 'password_reset' || stored.expires < Date.now() || stored.otp !== otp) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const resetToken = jwt.sign({ email: email.toLowerCase(), type: 'password_reset' }, JWT_SECRET, { expiresIn: '24h' });
  otpStore.delete(email.toLowerCase());

  logger.info(`Password reset OTP verified: ${email}`);
  res.status(200).json({ message: 'OTP verified', resetToken, email });
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  if (!resetToken || !newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Valid reset token and matching passwords required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
  } catch (error) {
    logger.warn(`Reset password failed: Invalid token - ${error.message}`);
    return res.status(400).json({ message: error.name === 'TokenExpiredError' ? 'Reset token expired' : 'Invalid reset token' });
  }

  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  logger.info(`Password reset: ${user.email}`);
  res.json({ message: 'Password reset successfully' });
});

// Signin
const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!validateEmail(email) || !password) {
    return res.status(400).json({ message: 'Valid email and password required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.warn(`Signin failed: Invalid credentials - ${email}`);
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  logger.info(`Signin successful: ${user.email}`);

  res.json({
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      bio: user.bio,
    },
    token,
  });
});

// Change Password
const changePassword = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;
  if (!email || !currentPassword || !newPassword || !confirmPassword) {
    logger.warn('Change password failed: Missing required fields');
    return res.status(400).json({ message: 'Email, current password, new password, and confirm password are required' });
  }

  if (newPassword !== confirmPassword) {
    logger.warn(`Change password failed: Passwords do not match - ${email}`);
    return res.status(400).json({ message: 'New password and confirm password do not match' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    logger.warn(`Change password failed: User not found - ${email}`);
    return res.status(404).json({ message: 'User not found' });
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    logger.warn(`Change password failed: Incorrect current password - ${email}`);
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  logger.info(`Password changed successfully: ${email}`);
  res.json({ status: 'success', message: 'Password changed successfully' });
});

// Set Security Question
const setSecurityQuestion = asyncHandler(async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ message: 'Question and answer required' });
  }

  const user = req.user;
  user.securityQuestion = question;
  user.securityAnswer = await bcrypt.hash(answer, 10);
  await user.save();

  logger.info(`Security question set: ${user.email}`);
  res.json({ message: 'Security question set successfully' });
});

// Verify Security Answer
const verifySecurityAnswer = asyncHandler(async (req, res) => {
  const { email, question, answer } = req.body;
  if (!validateEmail(email) || !question || !answer) {
    return res.status(400).json({ message: 'Valid email, question, and answer required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.securityQuestion !== question || !(await bcrypt.compare(answer, user.securityAnswer))) {
    logger.warn(`Security answer verification failed: ${email}`);
    return res.status(400).json({ message: 'Invalid email, question, or answer' });
  }

  const resetToken = jwt.sign({ email: user.email, type: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });
  logger.info(`Security answer verified: ${user.email}`);

  res.json({ message: 'Security answer verified', resetToken });
});

module.exports = {
  signup,
  verifyOTP,
  resendOTP,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
  signin,
  changePassword,
  setSecurityQuestion,
  verifySecurityAnswer,
};