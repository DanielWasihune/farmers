const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true },
  cropType: { type: String, required: true, trim: true },
  marketName: { 
    type: String, 
    required: true, 
    enum: ['Local', 'Export'],
    trim: true 
  },
  pricePerKg: { 
    type: Number, 
    required: true, 
    min: [0.01, 'Price per kg must be a positive number'] 
  },
  pricePerQuintal: { 
    type: Number, 
    required: true, 
    min: [0.01, 'Price per quintal must be a positive number'],
    validate: {
      validator: function(value) {
        // Ensure pricePerQuintal is at least 50 times pricePerKg
        return value >= this.pricePerKg * 50;
      },
      message: 'Price per quintal must be at least 50 times price per kg'
    }
  },
  date: { type: Date, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

cropSchema.index({ cropName: 1, cropType: 1, marketName: 1, date: 1 }, { unique: true });

cropSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CropPrice', cropSchema);