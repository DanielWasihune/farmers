const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { emitNewUser } = require('../controllers/socketHandlers');

module.exports = (io) => {
  const router = express.Router();

  // Public routes
  router.post('/signup', authController.signup);
  router.post('/verify-otp', (req, res) => authController.verifyOTP(req, res, io));
  router.post('/resend-otp', authController.resendOTP);
  router.post('/request-password-reset', authController.requestPasswordReset);
  router.post('/verify-password-reset-otp', authController.verifyPasswordResetOTP);
  router.post('/reset-password', authController.resetPassword);
  router.post('/signin', authController.signin);
  router.post('/verify-security-answer', authController.verifySecurityAnswer);

  // Protected routes
  router.post('/change-password', protect, authController.changePassword);
  router.post('/set-security-question', protect, authController.setSecurityQuestion);

  return router;
};