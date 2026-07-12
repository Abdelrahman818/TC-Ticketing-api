const { Joi, objectId, paginationQuery } = require('./common.validators');

const createTicket = Joi.object({
  title: Joi.string().trim().min(2).max(180).required(),
  description: Joi.string().trim().min(2).max(5000).required(),
  assignedUserId: objectId.allow(null),
  assignedDepartmentId: objectId.allow(null),
  statusId: objectId.allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  type: Joi.string().trim().max(80).default('task'),
  dueDate: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string().trim().max(40)).default([]),
});

const updateTicket = Joi.object({
  title: Joi.string().trim().min(2).max(180),
  description: Joi.string().trim().min(2).max(5000),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  type: Joi.string().trim().max(80),
  dueDate: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string().trim().max(40)),
}).min(1);

const listTickets = Joi.object({
  ...paginationQuery,
  statusId: objectId,
  assignedUserId: objectId,
  assignedDepartmentId: objectId,
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  search: Joi.string().trim().max(120),
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
  includeArchived: Joi.boolean().default(false),
});

const changeStatus = Joi.object({
  statusId: objectId.required(),
  note: Joi.string().trim().max(1000).allow(''),
});

const assignTicket = Joi.object({
  assignedUserId: objectId.allow(null),
  assignedDepartmentId: objectId.allow(null),
  note: Joi.string().trim().max(1000).allow(''),
}).or('assignedUserId', 'assignedDepartmentId');

const createComment = Joi.object({
  body: Joi.string().trim().min(1).max(5000).required(),
  visibility: Joi.string().valid('public', 'internal').default('public'),
});

module.exports = {
  assignTicket,
  changeStatus,
  createComment,
  createTicket,
  listTickets,
  updateTicket,
};
