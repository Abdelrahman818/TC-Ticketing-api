const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/db', healthController.checkDatabaseConnection);

module.exports = router;
