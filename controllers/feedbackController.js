const asyncHandler = require('express-async-handler');
const Feedback = require('../models/feedbackModel');
const User = require('../models/User');

const submitFeedback = asyncHandler(async (req, res) => {
  const { email, feedback } = req.body;

  if (!feedback || !email) {
    return res.status(400).json({ message: 'Feedback and email are required' });
  }

  // Optional: Verify the email matches the authenticated user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user._id.toString() !== req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: Email does not match authenticated user' });
  }

  const feedbackEntry = await Feedback.create({
    user: req.user.id,
    email: email.toLowerCase(),
    feedback,
  });

  res.status(201).json({ message: 'Feedback submitted successfully', feedback: feedbackEntry });
});

module.exports = { submitFeedback };