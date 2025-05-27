const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { CORS_CONFIG, UPLOADS_DIR } = require('../config/constants');

const configureMiddleware = (app) => {
  // Security middleware
  app.use(helmet());

  // CORS middleware
  app.use(cors(CORS_CONFIG));

  // JSON parsing
  app.use(express.json());

  // // Rate limiting
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   max: 100,
  // // });
  // app.use(limiter);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('Created uploads directory:', UPLOADS_DIR);
  }

  // Serve static files from uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));
};

module.exports = configureMiddleware;