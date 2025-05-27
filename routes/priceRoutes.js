const express = require('express');
const router = express.Router();
const {
  validateCropAndMarket,
  getAllPrices,
  getUniqueCrops,
  insertPrice,
  batchInsertPrices,
  updatePrice,
  deletePrice,
  batchDeletePrices,
  clonePrices
} = require('../controllers/cropPriceController');

// Get all prices with filters
router.get('/', getAllPrices);

// Get unique crop names and types
router.get('/crops', getUniqueCrops);

// Insert new crop price
router.post('/', validateCropAndMarket, insertPrice);

// Batch insert prices
router.post('/batch', batchInsertPrices);

// Update crop price
router.put('/:id', validateCropAndMarket, updatePrice);

// Delete a price
router.delete('/:id', deletePrice);

// Delete multiple prices by IDs
router.post('/delete-batch', batchDeletePrices);

// Clone prices from a source day to the target date
router.post('/clone', clonePrices);

module.exports = router;