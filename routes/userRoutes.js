// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../config/multer');
const { protect } = require('../middleware/authMiddleware'); // Change auth to protect

// router.use(express.json({ type: 'application/json', charset: 'utf-8' }));

// User routes
router.post('/update-profile', protect, upload.single('profilePicture'), userController.updateProfile);
router.get('/users', protect, userController.getUsers);

module.exports = router; // Remove io parameter since it’s not used