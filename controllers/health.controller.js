const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');

const checkDatabaseConnection = asyncHandler(async (req, res) => {
  const readyState = mongoose.connection.readyState;
  
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  if (readyState === 1) {
    return success(res, 'Database connection is healthy', {
      status: 'connected',
      readyState,
      database: mongoose.connection.db.getName(),
      host: mongoose.connection.host,
      port: mongoose.connection.port,
    });
  }

  return error(res, 503, `Database connection failed: ${states[readyState]}`, 'DB_CONNECTION_ERROR', {
    status: states[readyState],
    readyState,
  });
});

module.exports = {
  checkDatabaseConnection,
};
