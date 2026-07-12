const { Joi } = require('./common.validators');
const { objectId } = require('./common.validators');

const createDepartment = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().max(1000).allow('').default(''),
  managerId: objectId.allow(null),
  isActive: Joi.boolean().default(true),
});

const updateDepartment = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  description: Joi.string().trim().max(1000).allow(''),
  managerId: objectId.allow(null),
  isActive: Joi.boolean(),
}).min(1);

module.exports = {
  createDepartment,
  updateDepartment,
};
