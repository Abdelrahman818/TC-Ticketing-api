const express = require('express');
const testController = require('../controllers/test.controller');

const router = express.Router();

// Get all testing data
router.get('/', testController.getTestingData);

// Get testing data by ID
router.get('/:id', testController.getTestingDataById);

// Insert new testing data
router.post('/', testController.insertTestingData);

module.exports = router;
