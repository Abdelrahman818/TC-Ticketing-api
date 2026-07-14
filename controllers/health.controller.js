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

  const connectionInfo = {
    status: states[readyState],
    readyState,
    timestamp: new Date().toISOString(),
  };

  if (readyState === 1) {
    connectionInfo.database = mongoose.connection.db?.getName() || 'unknown';
    connectionInfo.host = mongoose.connection.host;
    connectionInfo.port = mongoose.connection.port;
    
    return success(res, 'Database connection is healthy', connectionInfo);
  }

  return error(
    res,
    503,
    `Database is ${states[readyState]}`,
    'DB_CONNECTION_ERROR',
    connectionInfo
  );
});

module.exports = {
  checkDatabaseConnection,
};
