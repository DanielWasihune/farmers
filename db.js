const mongoose = require('mongoose');
const asyncRetry = require('async-retry');

const connectDB = async () => {
  console.log('Attempting to connect to MongoDB with URI:', process.env.MONGO_URI.replace(/:([^@]+)@/, ':<hidden>@')); // Hide password

  try {
    await asyncRetry(
      async () => {
        await mongoose.connect(process.env.MONGO_URI, {
        });
      },
      {
        onRetry: (err, attempt) => {
          console.log(`Retry attempt ${attempt} due to error: ${err.message}`);
        },
      }
    );
    console.log('MongoDB connected successfully to:', mongoose.connection.host);

    // Log connection events for debugging
    mongoose.connection.on('connected', () => console.log('Mongoose connected to DB'));
    mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected from DB'));
    mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err.message));
  } catch (error) {
    console.error('MongoDB määritys epäonnistui:', error.message, { stack: error.stack });
    process.exit(1);
  }
};

module.exports = connectDB;