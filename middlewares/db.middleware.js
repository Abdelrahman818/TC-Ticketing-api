const connectDB = require('../lib/mongodb');

/**
 * Middleware to ensure MongoDB connection is established
 * Useful for serverless functions where each invocation needs to verify connection
 */
async function ensureDBConnection(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return res.status(503).json({
      success: false,
      code: 'DB_CONNECTION_ERROR',
      message: 'Database service temporarily unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
}

module.exports = ensureDBConnection;
