const { Joi, objectId } = require('./common.validators');

const dateRange = Joi.object({
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().required(),
  departmentId: objectId,
  supervisorId: objectId,
  userId: objectId,
  statusId: objectId,
});

const dashboardQuery = Joi.object({
  fromDate: Joi.date().iso(),
  toDate: Joi.date().iso(),
  departmentId: objectId,
  supervisorId: objectId,
});

module.exports = {
  dashboardQuery,
  dateRange,
};
