const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;
let cachedConnectionPromise = null;

async function connectDatabase(uri = process.env.MONGO_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI is required to connect to MongoDB');
    }

    memoryServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.14',
      },
    });

    uri = memoryServer.getUri();
    process.env.MONGO_URI = uri;
  }

  cachedConnectionPromise = mongoose.connect(uri).then(() => mongoose.connection);
  return cachedConnectionPromise;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }

  cachedConnectionPromise = null;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
