const { logger } = require('../utils/logger');

const validatePriceData = (req, res, next) => {
  const { cropName, cropType, marketName, price, unit } = req.body;

  if (!cropName || typeof cropName !== 'string' || cropName.trim() === '') {
    logger.warn('Validation failed: Invalid cropName');
    return res.status(400).json({ error: 'Crop name is required and must be a non-empty string' });
  }

  if (!cropType || typeof cropType !== 'string' || cropType.trim() === '') {
    logger.warn('Validation failed: Invalid cropType');
    return res.status(400).json({ error: 'Crop type is required and must be a non-empty string' });
  }

  if (!marketName || typeof marketName !== 'string' || marketName.trim() === '') {
    logger.warn('Validation failed: Invalid marketName');
    return res.status(400).json({ error: 'Market name is required and must be a non-empty string' });
  }

  if (typeof price !== 'number' || price < 0) {
    logger.warn('Validation failed: Invalid price');
    return res.status(400).json({ error: 'Price is required and must be a non-negative number' });
  }

  if (!unit || !['kg', 'quintal', 'ton'].includes(unit)) {
    logger.warn('Validation failed: Invalid unit');
    return res.status(400).json({ error: 'Unit is required and must be one of kg, quintal, ton' });
  }

  next();
};

module.exports = { validatePriceData };