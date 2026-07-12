const express = require('express');
const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const userValidators = require('../validators/user.validators');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/assignable',
  authorize('supervisor', 'manager', 'owner'),
  validate(userValidators.listAssignableUsers, 'query'),
  usersController.getAssignableUsers
);
router.get('/', authorize('manager', 'owner'), validate(userValidators.listUsers, 'query'), usersController.getUsers);
router.get('/:userId', authorize('manager', 'owner'), usersController.getUserById);
router.patch('/:userId', authorize('owner'), validate(userValidators.updateUser), usersController.updateUser);
router.delete('/:userId', authorize('owner'), usersController.deleteUser);
router.patch('/:userId/role', authorize('owner'), validate(userValidators.updateRole), usersController.updateUserRole);
router.patch('/:userId/deactivate', authorize('owner'), usersController.deactivateUser);

module.exports = router;
