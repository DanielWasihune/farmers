const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  online: { type: Boolean, default: false },
  profilePicture: { type: String },
  bio: { type: String },
  securityQuestion: { type: String },
  securityAnswer: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);