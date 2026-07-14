const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const HttpError = require('../utils/httpError');

/**
 * Get testing data from the 'test' collection
 */
const getTestingData = asyncHandler(async (req, res) => {
  try {
    // Access the 'test' collection directly
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new HttpError(503, 'Database connection not established', 'DB_CONNECTION_ERROR');
    }

    const testCollection = db.collection('testingData');
    const documents = await testCollection.find({}).toArray();

    if (documents.length === 0) {
      return success(res, 'No testing data found', { data: [] });
    }

    return success(res, 'Testing data retrieved successfully', { data: documents });
  } catch (err) {
    console.error('Error fetching testing data:', err.message);
    throw err;
  }
});

/**
 * Get a specific testing data document by ID
 */
const getTestingDataById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, 'Invalid document ID', 'INVALID_ID');
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new HttpError(503, 'Database connection not established', 'DB_CONNECTION_ERROR');
  }

  const testCollection = db.collection('test');
  const document = await testCollection.findOne({ _id: new mongoose.Types.ObjectId(id) });

  if (!document) {
    throw new HttpError(404, 'Testing data not found', 'NOT_FOUND');
  }

  return success(res, 'Testing data retrieved successfully', { data: document });
});

/**
 * Insert testing data into the 'test' collection
 */
const insertTestingData = asyncHandler(async (req, res) => {
  const { testingData } = req.body;

  if (!testingData) {
    throw new HttpError(400, 'testingData field is required', 'VALIDATION_ERROR');
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new HttpError(503, 'Database connection not established', 'DB_CONNECTION_ERROR');
  }

  const testCollection = db.collection('test');
  const result = await testCollection.insertOne({
    testingData,
    createdAt: new Date(),
  });

  return success(
    res,
    'Testing data inserted successfully',
    { insertedId: result.insertedId },
    201
  );
});

module.exports = {
  getTestingData,
  getTestingDataById,
  insertTestingData,
};
