const CropPrice = require('../models/cropPrice');
const { logger } = require('../utils/logger');

// List of valid crops and their types
const cropData = {
  teff: ["red teff", "white teff", "sergegna teff"],
  maize: ["white maize", "yellow maize"],
  wheat: ["durum wheat", "bread wheat"],
  barley: ["malt barley", "food barley"],
  sorghum: ["white sorghum", "red sorghum"],
  millet: ["finger millet", "pearl millet"],
  oats: ["common oats"],
  finger_millet: ["red finger millet", "brown finger millet"],
  triticale: ["common triticale"],
  rice: ["upland rice", "lowland rice"],
  chickpea: ["desi chickpea", "kabuli chickpea"],
  haricot_bean: ["red haricot", "white haricot"],
  lentil: ["red lentil", "green lentil"],
  faba_bean: ["small faba", "large faba"],
  pea: ["field pea", "garden pea"],
  grass_pea: ["common grass pea"],
  soybean: ["common soybean"],
  niger_seed: ["black niger", "yellow niger"],
  flaxseed: ["brown flaxseed", "golden flaxseed"],
  sesame: ["white sesame", "black sesame"],
  groundnut: ["red groundnut", "white groundnut"],
  sunflower: ["common sunflower"],
  potato: ["red potato", "white potato"],
  sweet_potato: ["orange sweet potato", "white sweet potato"],
  taro: ["common taro"],
  cassava: ["bitter cassava", "sweet cassava"],
  yam: ["white yam", "yellow yam"],
  enset: ["common enset"],
  onion: ["red onion", "white onion"],
  tomato: ["roma tomato", "cherry tomato"],
  cabbage: ["green cabbage", "red cabbage"],
  carrot: ["orange carrot", "purple carrot"],
  beetroot: ["red beetroot"],
  kale: ["curly kale", "lacinato kale"],
  lettuce: ["romaine lettuce", "iceberg lettuce"],
  spinach: ["flat-leaf spinach", "savoy spinach"],
  green_pepper: ["bell pepper", "jalapeno"],
  eggplant: ["long eggplant", "round eggplant"],
  okra: ["green okra"],
  squash: ["butternut squash", "acorn squash"],
  avocado: ["hass avocado", "fuerte avocado"],
  banana: ["cavendish banana", "plantain"],
  mango: ["kent mango", "keitt mango"],
  papaya: ["solo papaya", "maradol papaya"],
  orange: ["navel orange", "valencia orange"],
  lemon: ["eureka lemon", "lisbon lemon"],
  lime: ["persian lime", "key lime"],
  grapefruit: ["ruby red grapefruit", "white grapefruit"],
  pineapple: ["cayenne pineapple"],
  guava: ["white guava", "pink guava"],
  chilli_pepper: ["red chilli", "green chilli"],
  ginger: ["common ginger"],
  turmeric: ["yellow turmeric"],
  garlic: ["hardneck garlic", "softneck garlic"],
  fenugreek: ["common fenugreek"],
  coriander: ["common coriander"],
  coffee: ["arabica coffee", "robusta coffee"],
  tea: ["black tea", "green tea"],
  sugarcane: ["common sugarcane"],
  tobacco: ["virginia tobacco", "burley tobacco"],
  cotton: ["upland cotton", "pima cotton"],
  cut_flowers: ["rose", "lily"]
};

// List of valid market names
const validMarkets = ["Local", "Export"];

// Helper function to normalize date to midnight UTC
const normalizeDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Helper function to get Monday of the week
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return normalizeDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)));
};

// Middleware to validate cropName, cropType, marketName, pricePerKg, and pricePerQuintal
const validateCropAndMarket = (req, res, next) => {
  const { cropName, cropType, marketName, pricePerKg, pricePerQuintal } = req.body;

  if (!cropData[cropName]) {
    logger.warn(`Invalid crop name: ${cropName}`);
    return res.status(400).json({ error: 'Invalid crop name' });
  }

  if (!cropData[cropName].includes(cropType)) {
    logger.warn(`Invalid crop type: ${cropType} for crop: ${cropName}`);
    return res.status(400).json({ error: 'Invalid crop type for the selected crop' });
  }

  if (!validMarkets.includes(marketName)) {
    logger.warn(`Invalid market name: ${marketName}`);
    return res.status(400).json({ error: 'Invalid market name' });
  }

  if (typeof pricePerKg !== 'number' || pricePerKg <= 0) {
    logger.warn(`Invalid price per kg: ${pricePerKg}`);
    return res.status(400).json({ error: 'Price per kg must be a positive number' });
  }

  if (typeof pricePerQuintal !== 'number' || pricePerQuintal <= 0) {
    logger.warn(`Invalid price per quintal: ${pricePerQuintal}`);
    return res.status(400).json({ error: 'Price per quintal must be a positive number' });
  }

  if (pricePerQuintal < pricePerKg * 50) {
    logger.warn(`Price per quintal (${pricePerQuintal}) is less than 50 times price per kg (${pricePerKg})`);
    return res.status(400).json({ error: 'Price per quintal must be at least 50 times price per kg' });
  }

  next();
};

// Get all prices with filters
const getAllPrices = async (req, res) => {
  try {
    const { cropName, cropType, marketName, dateStart, dateEnd } = req.query;
    const query = {};

    if (cropName) query.cropName = new RegExp(cropName, 'i');
    if (cropType) query.cropType = new RegExp(cropType, 'i');
    if (marketName) query.marketName = new RegExp(marketName, 'i');
    if (dateStart && dateEnd) {
      query.date = {
        $gte: normalizeDate(dateStart),
        $lte: normalizeDate(dateEnd)
      };
    }

    const prices = await CropPrice.find(query).sort({ date: -1 });
    logger.info('Fetched prices with filters');
    res.json({ prices });
  } catch (error) {
    logger.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
};

// Get unique crop names and types
const getUniqueCrops = async (req, res) => {
  try {
    const crops = await CropPrice.aggregate([
      {
        $group: {
          _id: { cropName: '$cropName', cropType: '$cropType' },
          cropName: { $first: '$cropName' },
          cropType: { $first: '$cropType' }
        }
      },
      {
        $project: {
          _id: 0,
          cropName: 1,
          cropType: 1
        }
      },
      {
        $sort: { cropName: 1, cropType: 1 }
      }
    ]);
    logger.info('Fetched unique crop names and types');
    res.json(crops);
  } catch (error) {
    logger.error('Error fetching crops:', error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

// Insert new crop price
const insertPrice = async (req, res) => {
  try {
    const { cropName, cropType, marketName, pricePerKg, pricePerQuintal, date } = req.body;
    const normalizedDate = normalizeDate(date || Date.now());

    // Check for existing price
    const existingPrice = await CropPrice.findOne({
      cropName,
      cropType,
      marketName,
      date: normalizedDate
    });
    if (existingPrice) {
      logger.warn(`Price already exists for ${cropName} (${cropType}) in ${marketName} on ${normalizedDate}`);
      return res.status(400).json({ error: 'Price for this crop, type, and market already exists for this date' });
    }

    const newPrice = new CropPrice({
      cropName,
      cropType,
      marketName,
      pricePerKg,
      pricePerQuintal,
      date: normalizedDate,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newPrice.save();
    logger.info(`Inserted new price for ${cropName} (${cropType}) in ${marketName} on ${normalizedDate}`);
    res.status(201).json(newPrice);
  } catch (error) {
    logger.error('Error inserting price:', error);
    res.status(500).json({ error: 'Failed to insert price' });
  }
};

// Batch insert prices
const batchInsertPrices = async (req, res) => {
  try {
    const { prices } = req.body;
    if (!Array.isArray(prices) || prices.length === 0) {
      logger.warn('No prices provided for batch insertion');
      return res.status(400).json({ error: 'Prices array is required and cannot be empty' });
    }

    // Validate each price
    const validatedPrices = prices.map((price, index) => {
      if (!cropData[price.cropName]) {
        throw new Error(`Invalid crop name at index ${index}: ${price.cropName}`);
      }
      if (!cropData[price.cropName].includes(price.cropType)) {
        throw new Error(`Invalid crop type at index ${index}: ${price.cropType} for crop ${price.cropName}`);
      }
      if (!validMarkets.includes(price.marketName)) {
        throw new Error(`Invalid market name at index ${index}: ${price.marketName}`);
      }
      if (typeof price.pricePerKg !== 'number' || price.pricePerKg <= 0) {
        throw new Error(`Invalid price per kg at index ${index}: ${price.pricePerKg}`);
      }
      if (typeof price.pricePerQuintal !== 'number' || price.pricePerQuintal <= 0) {
        throw new Error(`Invalid price per quintal at index ${index}: ${price.pricePerQuintal}`);
      }
      if (price.pricePerQuintal < price.pricePerKg * 50) {
        throw new Error(`Price per quintal must be at least 50 times price per kg at index ${index}`);
      }
      if (!price.date) {
        throw new Error(`Date is required at index ${index}`);
      }
      return {
        ...price,
        date: normalizeDate(price.date),
        createdAt: price.createdAt ? new Date(price.createdAt) : new Date(),
        updatedAt: price.updatedAt ? new Date(price.updatedAt) : new Date()
      };
    });

    // Check for duplicates
    for (const [index, price] of validatedPrices.entries()) {
      const existingPrice = await CropPrice.findOne({
        cropName: price.cropName,
        cropType: price.cropType,
        marketName: price.marketName,
        date: price.date
      });
      if (existingPrice) {
        logger.warn(`Duplicate price at index ${index} for ${price.cropName} (${price.cropType}) in ${price.marketName} on ${price.date}`);
        return res.status(400).json({
          error: `Duplicate price at index ${index} for ${price.cropName} (${price.cropType}) in ${price.marketName} on ${price.date}`
        });
      }
    }

    // Insert prices
    const result = await CropPrice.insertMany(validatedPrices, { ordered: false });
    logger.info(`Batch inserted ${result.length} prices`);
    res.status(201).json({
      insertedCount: result.length,
      insertedIds: result.map(doc => doc._id.toString())
    });
  } catch (error) {
    logger.error('Error batch inserting prices:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update crop price
const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cropName, cropType, marketName, pricePerKg, pricePerQuintal, date, createdAt } = req.body;
    const normalizedDate = normalizeDate(date || Date.now());

    const price = await CropPrice.findById(id);
    if (!price) {
      logger.warn(`Price not found for ID: ${id}`);
      return res.status(404).json({ error: 'Price not found' });
    }

    // Check for conflicting price
    const existingPrice = await CropPrice.findOne({
      cropName,
      cropType,
      marketName,
      date: normalizedDate,
      _id: { $ne: id }
    });
    if (existingPrice) {
      logger.warn(`Price already exists for ${cropName} (${cropType}) in ${marketName} on ${normalizedDate}`);
      return res.status(400).json({ error: 'Price for this crop, type, and market already exists for this date' });
    }

    price.cropName = cropName;
    price.cropType = cropType;
    price.marketName = marketName;
    price.pricePerKg = pricePerKg;
    price.pricePerQuintal = pricePerQuintal;
    price.date = normalizedDate;
    price.createdAt = createdAt ? new Date(createdAt) : price.createdAt;
    price.updatedAt = new Date();

    await price.save();
    logger.info(`Updated price for ${cropName} (${cropType}) in ${marketName} on ${normalizedDate}`);
    res.json(price);
  } catch (error) {
    logger.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
};

// Delete a price
const deletePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await CropPrice.findByIdAndDelete(id);
    if (!price) {
      logger.warn(`Price not found for ID: ${id}`);
      return res.status(404).json({ error: 'Price not found' });
    }

    logger.info(`Deleted price with ID: ${id}`);
    res.json({ message: 'Price deleted successfully' });
  } catch (error) {
    logger.error('Error deleting price:', error);
    res.status(500).json({ error: 'Failed to delete price' });
  }
};

// Delete multiple prices by IDs
const batchDeletePrices = async (req, res) => {
  try {
    const { priceIds } = req.body;

    if (!Array.isArray(priceIds) || priceIds.length === 0) {
      logger.warn('No price IDs provided for batch deletion');
      return res.status(400).json({ error: 'Price IDs array is required and cannot be empty' });
    }

    const result = await CropPrice.deleteMany({ _id: { $in: priceIds } });
    if (result.deletedCount === 0) {
      logger.warn('No prices found for the provided IDs');
      return res.status(404).json({ error: 'No prices found for the provided IDs' });
    }

    logger.info(`Deleted ${result.deletedCount} prices in batch`);
    res.json({ message: `${result.deletedCount} prices deleted successfully`, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error('Error deleting prices in batch:', error);
    res.status(500).json({ error: 'Failed to delete prices' });
  }
};

// Clone prices from a source day to the target date
const clonePrices = async (req, res) => {
  try {
    const { sourceDays, targetDate } = req.body;

    if (!sourceDays || !Array.isArray(sourceDays) || sourceDays.length === 0 || !targetDate) {
      logger.warn('Missing or invalid sourceDays or targetDate');
      return res.status(400).json({ error: 'Source days and target date are required' });
    }

    // Parse and normalize dates
    const normalizedSourceDays = sourceDays.map(day => normalizeDate(day)).filter(day => day);
    const normalizedTargetDate = normalizeDate(targetDate);

    if (normalizedSourceDays.length === 0) {
      logger.warn('No valid source days provided');
      return res.status(400).json({ error: 'No valid source days provided' });
    }

    logger.info(`Cloning from ${normalizedSourceDays.length} source days to target date: ${normalizedTargetDate}`);
    logger.debug(`Source days: ${normalizedSourceDays.map(d => d.toISOString()).join(', ')}`);

    // Fetch existing prices for the target date to check for duplicates
    const existingPrices = await CropPrice.find({
      date: normalizedTargetDate
    });

    logger.info(`Found ${existingPrices.length} existing prices for target date ${normalizedTargetDate}`);

    const existingPriceKeys = new Set(
      existingPrices.map(price => `${price.cropName}|${price.cropType}|${price.marketName}`)
    );

    let totalCloned = 0;
    const clonedPriceIds = [];
    const failedRecords = [];

    // Process each source day
    for (const sourceDay of normalizedSourceDays) {
      // Fetch prices for the source day
      const sourcePrices = await CropPrice.find({
        date: sourceDay
      });

      if (!sourcePrices || sourcePrices.length === 0) {
        logger.warn(`No prices found for source day ${sourceDay.toISOString()}`);
        continue;
      }

      logger.info(`Fetched ${sourcePrices.length} prices from source day ${sourceDay.toISOString()}`);
      logger.debug(`Source prices: ${sourcePrices.map(p => `${p.cropName}|${p.cropType}|${p.marketName}`).join(', ')}`);

      // Filter out duplicates
      const newPrices = sourcePrices
        .filter(price => {
          const priceKey = `${price.cropName}|${price.cropType}|${price.marketName}`;
          return !existingPriceKeys.has(priceKey);
        })
        .map(price => ({
          cropName: price.cropName,
          cropType: price.cropType,
          marketName: price.marketName,
          pricePerKg: price.pricePerKg,
          pricePerQuintal: price.pricePerQuintal,
          date: normalizedTargetDate,
          createdAt: normalizedTargetDate,
          updatedAt: normalizedTargetDate
        }));

      if (newPrices.length === 0) {
        logger.info(`No new prices to clone for source day ${sourceDay.toISOString()} after filtering duplicates`);
        continue;
      }

      logger.info(`Prepared ${newPrices.length} prices for cloning from source day ${sourceDay.toISOString()}`);

      // Insert cloned prices in batches
      const batchSize = 50;
      for (let i = 0; i < newPrices.length; i += batchSize) {
        const batch = newPrices.slice(i, i + batchSize);
        try {
          const result = await CropPrice.insertMany(batch, { ordered: false });
          clonedPriceIds.push(...result.map(doc => doc._id.toString()));
          totalCloned += result.length;
          logger.info(`Inserted ${result.length} prices in batch ${i / batchSize + 1} for source day ${sourceDay.toISOString()}`);
        } catch (batchError) {
          logger.error(`Error in batch ${i / batchSize + 1} for source day ${sourceDay.toISOString()}: ${batchError.message}`);
          batch.forEach((price, index) => {
            failedRecords.push({
              index: i + index,
              price,
              error: batchError.message,
              sourceDay
            });
          });
        }
      }

      // Update existingPriceKeys to prevent duplicates across days
      newPrices.forEach(price => {
        const priceKey = `${price.cropName}|${price.cropType}|${price.marketName}`;
        existingPriceKeys.add(priceKey);
      });
    }

    if (totalCloned === 0) {
      logger.info('No new prices to clone after filtering duplicates');
      return res.status(200).json({
        message: 'No new prices to clone after filtering duplicates',
        clonedPriceIds: []
      });
    }

    logger.info(`Total cloned prices: ${totalCloned}`);
    if (failedRecords.length > 0) {
      logger.warn(`Failed to clone ${failedRecords.length} records`);
      failedRecords.forEach(failed => {
        logger.warn(`Failed record ${failed.index}: ${failed.price.cropName}, ${failed.price.cropType}, ${failed.price.marketName}, Error: ${failed.error}`);
      });
    }

    // Verify insertion
    const finalCount = await CropPrice.countDocuments({ date: normalizedTargetDate });
    logger.info(`Total records in database for ${normalizedTargetDate}: ${finalCount}`);

    res.status(201).json({
      message: `${totalCloned} prices cloned successfully`,
      clonedPriceIds,
      clonedPrices: totalCloned,
      failedRecords: failedRecords.length > 0 ? failedRecords : undefined
    });
  } catch (error) {
    logger.error('Error cloning prices:', error);
    res.status(500).json({ error: 'Failed to clone prices', details: error.message });
  }
};

module.exports = {
  validateCropAndMarket,
  getAllPrices,
  getUniqueCrops,
  insertPrice,
  batchInsertPrices,
  updatePrice,
  deletePrice,
  batchDeletePrices,
  clonePrices
};