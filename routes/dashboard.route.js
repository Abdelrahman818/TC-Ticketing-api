const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { dashboardQuery } = require('../validators/report.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/me', validate(dashboardQuery, 'query'), dashboardController.getMyDashboard);
router.get(
  '/team',
  authorize('supervisor', 'manager', 'owner'),
  validate(dashboardQuery, 'query'),
  dashboardController.getTeamDashboard
);
router.get(
  '/departments',
  authorize('manager', 'owner'),
  validate(dashboardQuery, 'query'),
  dashboardController.getDepartmentDashboard
);
router.get(
  '/supervisors',
  authorize('manager', 'owner'),
  validate(dashboardQuery, 'query'),
  dashboardController.getSupervisorDashboard
);
router.get('/system', authorize('owner'), dashboardController.getSystemDashboard);

module.exports = router;
