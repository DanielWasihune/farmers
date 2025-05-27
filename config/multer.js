const multer = require('multer');

const storage = multer.memoryStorage(); // Use memory storage for Koyeb compatibility

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('Multer: File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('Multer: Rejected file type:', file.mimetype);
      cb(new Error(`Invalid input: Unsupported file type. Supported types: ${allowedTypes.join(', ')}`), false);
    }
  },
});

module.exports = upload;