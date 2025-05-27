const authRoutes = require('./authRoutes');
const messageRoutes = require('./messageRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const userRoutes = require('./userRoutes');
const priceRoutes = require('./priceRoutes');

const configureRoutes = (app, io) => {
  app.use('/api/auth', authRoutes(io));
  app.use('/api/prices', priceRoutes);
  app.use('/api', messageRoutes);
  app.use('/api', feedbackRoutes);
  app.use('/api', userRoutes);
};

module.exports = configureRoutes;