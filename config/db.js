const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pc_doctor');

    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB connection lost. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB Reconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    console.error('[Database Hint] Make sure MongoDB is running locally or provide a valid MONGODB_URI in server/.env (e.g. MongoDB Atlas).');
    // Don't crash immediately so API server can still respond with meaningful error status
  }
};

module.exports = connectDB;
