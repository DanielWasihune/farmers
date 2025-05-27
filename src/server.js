const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const configureMiddleware = require('../middleware');
const configureRoutes = require('../routes');
const { initializeSocket } = require('../socket');
const { logger } = require('../utils/logger');
const path = require('path');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Health check for Koyeb
app.get('/', (req, res) => {
  logger.info('Health check accessed', { ip: req.ip });
  res.status(200).send('OK');
});

// Serve static files from Uploads
const uploadsPath = path.join(__dirname, 'Uploads');
logger.info(`Server: Serving static files from: ${uploadsPath}`);
app.use('/Uploads', express.static(uploadsPath));

// Connect to database
logger.info('Server: Connecting to database');
connectDB();

// Configure middleware
logger.info('Server: Configuring middleware');
configureMiddleware(app);

// Configure routes
logger.info('Server: Configuring routes');
configureRoutes(app, initializeSocket(server));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV });
});

module.exports = app;