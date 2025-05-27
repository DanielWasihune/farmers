// routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/feedback - Submit feedback (protected route)
router.route('/feedback').post(protect, submitFeedback);

module.exports = router;