const { Joi, objectId } = require('./common.validators');

const syncProfile = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  departmentId: objectId.allow(null),
  supervisorId: objectId.allow(null),
});

const createUser = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('employee', 'supervisor', 'manager', 'controller', 'owner').default('employee'),
  departmentId: objectId.allow(null),
  supervisorId: objectId.allow(null),
  isActive: Joi.boolean().default(true),
});

module.exports = {
  syncProfile,
  createUser,
};
