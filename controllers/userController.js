const User = require('../models/User');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Simple retry mechanism for database operations
const retryOperation = async (operation, maxRetries = 3, delay = 500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying after ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

exports.updateProfile = async (req, res) => {
  const { email, username, bio } = req.body;
  console.log('Update profile request:', {
    email: email.toLowerCase(),
    username,
    bio,
    file: req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'No file uploaded',
  });

  try {
    // Find user with retry mechanism
    const user = await retryOperation(() =>
      User.findOne({ email: email.toLowerCase() })
    );
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Validate username uniqueness with retry
    if (username && username !== user.username) {
      const existingUser = await retryOperation(() =>
        User.findOne({
          username: username,
          email: { $ne: email.toLowerCase() },
        })
      );
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already in use' });
      }
    }

    let profilePicturePath = user.profilePicture;
    if (req.file) {
      const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      if (!supportedMimeTypes.includes(req.file.mimetype)) {
        throw new Error('Invalid input: Unsupported image format. Supported types: ' + supportedMimeTypes.join(', '));
      }

      const uploadDir = path.join(process.cwd(), 'Uploads');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (err) {
        console.error('Failed to ensure upload directory:', err);
      }

      // Delete the previous profile picture if it exists
      if (user.profilePicture && user.profilePicture.startsWith('/Uploads/')) {
        const oldPicturePath = path.join(process.cwd(), user.profilePicture);
        try {
          await fs.unlink(oldPicturePath);
          console.log(`Deleted previous profile picture: ${oldPicturePath}`);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            console.error(`Failed to delete previous profile picture: ${oldPicturePath}`, err);
          }
        }
      }

      // Resize image and save new profile picture
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 200, height: 200, fit: 'cover' })
        .toBuffer();

      const filename = `profile_${Date.now()}_${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, buffer);
      profilePicturePath = `/Uploads/${filename}`;
    }

    // Update user fields
    user.username = username || user.username;
    user.bio = bio || user.bio;
    if (profilePicturePath) {
      user.profilePicture = profilePicturePath;
    }

    // Save user with retry mechanism
    await retryOperation(() => user.save());

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error.message, { stack: error.stack });
    const statusCode = error.message.includes('Invalid input') || error.message.includes('Unsupported') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'email username online profilePicture').lean();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};