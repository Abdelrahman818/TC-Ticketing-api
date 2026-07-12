const { AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

function buildAuditFilters(query) {
  const filters = {};
  if (query.actorId) filters.actorId = query.actorId;
  if (query.entityType) filters.entityType = query.entityType;
  if (query.entityId) filters.entityId = query.entityId;
  if (query.action) filters.action = query.action;
  if (query.fromDate || query.toDate) {
    filters.createdAt = {};
    if (query.fromDate) filters.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filters.createdAt.$lte = new Date(query.toDate);
  }
  return filters;
}

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;
  const filters = buildAuditFilters(req.query);

  const [items, totalItems] = await Promise.all([
    AuditLog.find(filters).populate('actorId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filters),
  ]);

  return success(res, 'Audit logs fetched successfully', {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1,
    },
  });
});

module.exports = {
  getAuditLogs,
};
