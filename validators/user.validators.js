const { Joi, objectId, paginationQuery } = require('./common.validators');

const listAssignableUsers = Joi.object({
  departmentId: objectId,
});

const listUsers = Joi.object({
  ...paginationQuery,
  role: Joi.string().valid('employee', 'supervisor', 'manager', 'owner'),
  departmentId: objectId,
  supervisorId: objectId,
  search: Joi.string().trim().max(120),
  isActive: Joi.boolean(),
});

const updateUser = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  email: Joi.string().email(),
  password: Joi.string().trim().min(4).max(120),
  role: Joi.string().valid('employee', 'supervisor', 'manager', 'owner'),
  departmentId: objectId.allow(null),
  supervisorId: objectId.allow(null),
  isActive: Joi.boolean(),
}).min(1);

const updateRole = Joi.object({
  role: Joi.string().valid('employee', 'supervisor', 'manager', 'owner').required(),
});

module.exports = {
  listAssignableUsers,
  listUsers,
  updateRole,
  updateUser,
};
