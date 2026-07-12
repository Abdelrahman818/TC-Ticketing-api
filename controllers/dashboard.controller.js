const mongoose = require('mongoose');
const { Department, Stage, Ticket, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { buildTicketScopeQuery, getTeamEmployeeIds } = require('../services/access.service');

function dateFilter(query) {
  const filter = {};
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) filter.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filter.createdAt.$lte = new Date(query.toDate);
  }
  return filter;
}

async function getFinalStageIds(keys = ['done', 'canceled']) {
  const stages = await Stage.find({
    $or: [{ isFinal: true }, { key: { $in: keys } }],
  }).select('_id key');

  return stages.reduce(
    (acc, stage) => {
      if (stage.key === 'canceled') acc.canceled.push(stage._id);
      else acc.completed.push(stage._id);
      return acc;
    },
    { completed: [], canceled: [] }
  );
}

async function summarizeTickets(baseQuery = {}) {
  const { completed, canceled } = await getFinalStageIds();
  const now = new Date();
  const [totalTickets, completedTickets, canceledTickets, overdueTickets] = await Promise.all([
    Ticket.countDocuments(baseQuery),
    Ticket.countDocuments({ ...baseQuery, statusId: { $in: completed } }),
    Ticket.countDocuments({ ...baseQuery, statusId: { $in: canceled } }),
    Ticket.countDocuments({
      ...baseQuery,
      dueDate: { $lt: now },
      statusId: { $nin: [...completed, ...canceled] },
      isArchived: false,
    }),
  ]);

  return {
    totalTickets,
    openTickets: Math.max(totalTickets - completedTickets - canceledTickets, 0),
    completedTickets,
    canceledTickets,
    overdueTickets,
  };
}

const getMyDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee') {
    throw new HttpError(403, 'Employees do not have access to the dashboard', 'FORBIDDEN');
  }

  const scope = await buildTicketScopeQuery(req.user);
  const baseQuery = Object.keys(scope).length ? scope : {};
  const summary = await summarizeTickets(baseQuery);
  const [assignedTickets, departmentTickets] = await Promise.all([
    Ticket.countDocuments({ assignedUserId: req.user._id }),
    req.user.departmentId ? Ticket.countDocuments({ assignedDepartmentId: req.user.departmentId }) : 0,
  ]);

  return success(res, 'Dashboard fetched successfully', {
    assignedTickets,
    departmentTickets,
    completedTickets: summary.completedTickets,
    overdueTickets: summary.overdueTickets,
    averageCompletionTimeHours: null,
  });
});

const getTeamDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee') {
    throw new HttpError(403, 'Employees do not have access to the dashboard', 'FORBIDDEN');
  }

  let supervisorId = req.query.supervisorId || null;
  let filterDepartmentId = null;

  if (req.user.role === 'supervisor') {
    supervisorId = req.user._id;
    filterDepartmentId = req.user.departmentId;
  } else if (req.user.role === 'manager') {
    if (!supervisorId) {
      throw new HttpError(400, 'supervisorId query parameter is required', 'VALIDATION_ERROR');
    }
    const targetSupervisor = await User.findOne({ _id: supervisorId, role: 'supervisor' });
    if (req.user.departmentId && targetSupervisor && String(targetSupervisor.departmentId || '') !== String(req.user.departmentId || '')) {
      throw new HttpError(403, 'Managers can only view team productivity in their own department', 'FORBIDDEN');
    }
    filterDepartmentId = req.user.departmentId;
  }

  const employeeIds = supervisorId ? await getTeamEmployeeIds(supervisorId, filterDepartmentId) : [];
  const baseQuery = {
    ...dateFilter(req.query),
  };

  if (supervisorId) {
    baseQuery.assignedUserId = { $in: employeeIds };
  }

  const summary = await summarizeTickets(baseQuery);

  const employeeQuery = supervisorId ? { supervisorId } : { role: 'employee' };
  if (filterDepartmentId) {
    employeeQuery.departmentId = filterDepartmentId;
  }

  const employees = await User.find(employeeQuery).select('name email role');
  const employeeStats = await Promise.all(
    employees.map(async (employee) => ({
      userId: employee._id,
      name: employee.name,
      assignedTickets: await Ticket.countDocuments({ ...dateFilter(req.query), assignedUserId: employee._id }),
      completedTickets: await Ticket.countDocuments({
        ...dateFilter(req.query),
        assignedUserId: employee._id,
        statusId: { $in: (await getFinalStageIds()).completed },
      }),
      overdueTickets: await Ticket.countDocuments({
        assignedUserId: employee._id,
        dueDate: { $lt: new Date() },
        isArchived: false,
        statusId: { $nin: [...(await getFinalStageIds()).completed, ...(await getFinalStageIds()).canceled] },
      }),
    }))
  );

  return success(res, 'Team dashboard fetched successfully', {
    ...summary,
    averageCompletionTimeHours: null,
    employees: employeeStats,
  });
});

const getDepartmentDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee') {
    throw new HttpError(403, 'Employees do not have access to the dashboard', 'FORBIDDEN');
  }

  const query = { isActive: true };
  if (req.user.role === 'manager' && req.user.departmentId) {
    query._id = req.user.departmentId;
  }

  const departments = await Department.find(query).sort({ name: 1 });
  const data = await Promise.all(
    departments.map(async (department) => {
      const summary = await summarizeTickets({
        ...dateFilter(req.query),
        assignedDepartmentId: department._id,
      });
      return {
        departmentId: department._id,
        departmentName: department.name,
        ...summary,
      };
    })
  );

  return success(res, 'Department dashboard fetched successfully', { departments: data });
});

const getSupervisorDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee') {
    throw new HttpError(403, 'Employees do not have access to the dashboard', 'FORBIDDEN');
  }

  const query = { role: 'supervisor', isActive: true };
  let filterDepartmentId = null;

  if (req.user.role === 'manager' && req.user.departmentId) {
    query.departmentId = req.user.departmentId;
    filterDepartmentId = req.user.departmentId;
  }

  const supervisors = await User.find(query).select('name email');
  const data = await Promise.all(
    supervisors.map(async (supervisor) => {
      const employeeIds = await getTeamEmployeeIds(supervisor._id, filterDepartmentId);
      const summary = await summarizeTickets({
        ...dateFilter(req.query),
        assignedUserId: { $in: employeeIds },
      });
      return {
        supervisorId: supervisor._id,
        name: supervisor.name,
        teamSize: employeeIds.length,
        ...summary,
        averageCompletionTimeHours: null,
      };
    })
  );

  let managersData = [];
  if (req.user.role === 'owner') {
    const managers = await User.find({ role: 'manager', isActive: true }).select('name email');
    managersData = await Promise.all(
      managers.map(async (mgr) => {
        const managedDepts = await Department.find({ managerId: mgr._id, isActive: true }).select('_id');
        const deptIds = managedDepts.map((d) => d._id);
        const summary = await summarizeTickets({
          ...dateFilter(req.query),
          assignedDepartmentId: { $in: deptIds },
        });
        return {
          managerId: mgr._id,
          name: mgr.name,
          departmentsCount: deptIds.length,
          ...summary,
        };
      })
    );
  }

  return success(res, 'Supervisor performance fetched successfully', {
    supervisors: data,
    managers: managersData,
  });
});

const getSystemDashboard = asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    throw new HttpError(403, 'Only owners can access the system dashboard', 'FORBIDDEN');
  }

  const [employees, supervisors, managers, owners, departments, tickets] = await Promise.all([
    User.countDocuments({ role: 'employee', isActive: true }),
    User.countDocuments({ role: 'supervisor', isActive: true }),
    User.countDocuments({ role: 'manager', isActive: true }),
    User.countDocuments({ role: 'owner', isActive: true }),
    Department.countDocuments({ isActive: true }),
    summarizeTickets({}),
  ]);

  return success(res, 'System dashboard fetched successfully', {
    users: {
      employees,
      supervisors,
      managers,
      owners,
    },
    tickets: {
      total: tickets.totalTickets,
      open: tickets.openTickets,
      completed: tickets.completedTickets,
      canceled: tickets.canceledTickets,
    },
    departments,
  });
});

module.exports = {
  getDepartmentDashboard,
  getMyDashboard,
  getSupervisorDashboard,
  getSystemDashboard,
  getTeamDashboard,
};
