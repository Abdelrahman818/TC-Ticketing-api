const { Joi } = require('./common.validators');
const { objectId } = require('./common.validators');

const createStage = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  key: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).required(),
  order: Joi.number().integer().min(1).required(),
  color: Joi.string().trim().max(32).default('#64748b'),
  isDefault: Joi.boolean().default(false),
  isFinal: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  visibleToRoles: Joi.array().items(Joi.string().valid('employee', 'supervisor', 'manager', 'controller', 'owner')).default(['employee', 'supervisor', 'manager', 'controller', 'owner']),
});

const updateStage = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  order: Joi.number().integer().min(1),
  color: Joi.string().trim().max(32),
  isDefault: Joi.boolean(),
  isFinal: Joi.boolean(),
  isActive: Joi.boolean(),
  visibleToRoles: Joi.array().items(Joi.string().valid('employee', 'supervisor', 'manager', 'controller', 'owner')),
}).min(1);

const reorderStages = Joi.object({
  stages: Joi.array()
    .items(
      Joi.object({
        stageId: objectId.required(),
        order: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

module.exports = {
  createStage,
  reorderStages,
  updateStage,
};
