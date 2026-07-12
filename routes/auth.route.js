const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const authValidators = require('../validators/auth.validators');

const router = express.Router();

router.post('/sync', requireAuth, validate(authValidators.syncProfile), authController.syncProfile);
router.post('/dev-login', authController.devLogin);
router.post('/dev-register', authController.devRegister);
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/logout', requireAuth, authController.logout);

// My routes
router.post('/register', authController.signup);
router.post('/login', authController.login);

module.exports = router;
