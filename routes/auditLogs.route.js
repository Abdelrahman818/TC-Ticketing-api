const express = require('express');
const auditLogsController = require('../controllers/auditLogs.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const auditValidators = require('../validators/audit.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', authorize('owner'), validate(auditValidators.listAuditLogs, 'query'), auditLogsController.getAuditLogs);

module.exports = router;
