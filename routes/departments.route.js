const express = require('express');
const departmentsController = require('../controllers/departments.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const departmentValidators = require('../validators/department.validators');

const router = express.Router();

router.get('/', departmentsController.getDepartments);

router.use(requireAuth);

router.post('/', authorize('owner'), validate(departmentValidators.createDepartment), departmentsController.createDepartment);

router.patch(
  '/:departmentId',
  authorize('owner'),
  validate(departmentValidators.updateDepartment),
  departmentsController.updateDepartment
);

router.delete(
  '/:departmentId',
  authorize('owner'),
  departmentsController.deleteDepartment
);

module.exports = router;
