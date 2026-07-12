const { Ticket, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { buildTicketScopeQuery, getTeamEmployeeIds } = require('../services/access.service');

function reportDateFilter(query) {
  return {
    createdAt: {
      $gte: new Date(query.fromDate),
      $lte: new Date(query.toDate),
    },
  };
}

async function scopedReportQuery(req) {
  const scope = await buildTicketScopeQuery(req.user);
  const filters = reportDateFilter(req.query);

  if (req.query.departmentId) filters.assignedDepartmentId = req.query.departmentId;
  if (req.query.statusId) filters.statusId = req.query.statusId;
  if (req.query.userId) filters.assignedUserId = req.query.userId;
  if (req.query.supervisorId) {
    const ids = await getTeamEmployeeIds(req.query.supervisorId);
    filters.assignedUserId = { $in: ids };
  }

  return Object.keys(scope).length ? { $and: [scope, filters] } : filters;
}

const getTicketReport = asyncHandler(async (req, res) => {
  const query = await scopedReportQuery(req);
  const [totalTickets, completedTickets, canceledTickets] = await Promise.all([
    Ticket.countDocuments(query),
    Ticket.countDocuments({ ...query, isArchived: false }),
    Ticket.countDocuments({ ...query, isArchived: true }),
  ]);

  return success(res, 'Ticket report generated successfully', {
    totalTickets,
    completedTickets,
    openTickets: Math.max(totalTickets - completedTickets - canceledTickets, 0),
    canceledTickets,
    averageCompletionTimeHours: null,
  });
});

const getPerformanceReport = asyncHandler(async (req, res) => {
  let usersQuery = {};
  if (req.user.role === 'supervisor') {
    usersQuery._id = { $in: await getTeamEmployeeIds(req.user._id) };
  }
  if (req.query.userId) usersQuery._id = req.query.userId;
  if (req.query.departmentId) usersQuery.departmentId = req.query.departmentId;
  if (req.query.supervisorId) usersQuery.supervisorId = req.query.supervisorId;

  const users = await User.find(usersQuery).select('name role');
  const items = await Promise.all(
    users.map(async (user) => {
      const assignedQuery = {
        ...reportDateFilter(req.query),
        assignedUserId: user._id,
      };
      return {
        userId: user._id,
        name: user.name,
        role: user.role,
        assignedTickets: await Ticket.countDocuments(assignedQuery),
        completedTickets: await Ticket.countDocuments({ ...assignedQuery, isArchived: false }),
        overdueTickets: await Ticket.countDocuments({
          assignedUserId: user._id,
          dueDate: { $lt: new Date() },
          isArchived: false,
        }),
        averageCompletionTimeHours: null,
      };
    })
  );

  return success(res, 'Performance report generated successfully', { items });
});

module.exports = {
  getPerformanceReport,
  getTicketReport,
};
