const { Joi, objectId, paginationQuery } = require('./common.validators');

const listAuditLogs = Joi.object({
  ...paginationQuery,
  actorId: objectId,
  entityType: Joi.string().trim().max(80),
  entityId: objectId,
  action: Joi.string().trim().max(120),
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
});

module.exports = {
  listAuditLogs,
};
