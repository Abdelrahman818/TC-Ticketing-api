const { error } = require('../utils/apiResponse');

function notFound(req, res) {
  return error(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND');
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    return error(res, 422, 'Validation failed', 'VALIDATION_ERROR', err.errors);
  }

  if (err.name === 'CastError') {
    return error(res, 400, 'Invalid resource id', 'INVALID_ID');
  }

  if (err.code === 11000) {
    return error(res, 409, 'Duplicated value already exists', 'DUPLICATE_VALUE', err.keyValue);
  }

  // Handle MongoDB connection errors
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
    console.error('Database connection error:', err.message);
    return error(res, 503, 'Database service temporarily unavailable', 'DB_CONNECTION_ERROR');
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  // In development, show actual error message; in production, show generic message
  const message = process.env.NODE_ENV === 'development' ? err.message : (statusCode === 500 ? 'Internal server error' : err.message);

  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode,
      stack: err.stack,
    });
  }

  return error(res, statusCode, message, code, err.details || null);
}

module.exports = {
  notFound,
  errorHandler,
};
