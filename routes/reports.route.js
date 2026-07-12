const express = require('express');
const reportsController = require('../controllers/reports.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { dateRange } = require('../validators/report.validators');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/tickets',
  authorize('supervisor', 'manager', 'owner'),
  validate(dateRange, 'query'),
  reportsController.getTicketReport
);
router.get(
  '/performance',
  authorize('supervisor', 'manager', 'owner'),
  validate(dateRange, 'query'),
  reportsController.getPerformanceReport
);

module.exports = router;
