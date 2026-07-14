const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('../lib/mongodb');

let memoryServer;
let cachedConnectionPromise = null;

/**
 * Connect to MongoDB
 * - Uses cached connection from lib/mongodb.js for production/Vercel
 * - Uses in-memory MongoDB for testing
 */
async function connectDatabase(uri = process.env.MONGODB_URI || process.env.tickets_MONGODB_URI) {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection promise is already in flight, return it
  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  // Use in-memory MongoDB for testing/development if no URI provided
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MONGODB_URI or tickets_MONGODB_URI is required in production. ' +
        'Set it in your Vercel environment variables.'
      );
    }

    try {
      memoryServer = await MongoMemoryServer.create({
        binary: {
          version: '7.0.14',
        },
      });

      uri = memoryServer.getUri();
      process.env.MONGODB_URI = uri;
      console.log('Using in-memory MongoDB for testing');
    } catch (error) {
      console.error('Failed to start in-memory MongoDB:', error.message);
      throw error;
    }
  }

  // Use the serverless-compatible connection helper
  cachedConnectionPromise = connectDB();
  return cachedConnectionPromise;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    } catch (error) {
      console.error('Error disconnecting MongoDB:', error.message);
    }
  }

  if (memoryServer) {
    try {
      await memoryServer.stop();
      memoryServer = null;
      console.log('In-memory MongoDB stopped');
    } catch (error) {
      console.error('Error stopping in-memory MongoDB:', error.message);
    }
  }

  cachedConnectionPromise = null;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
