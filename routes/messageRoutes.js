// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware'); // Change auth to protect

// Fetch messages between two users
router.get('/messages', protect, getMessages);

module.exports = router;