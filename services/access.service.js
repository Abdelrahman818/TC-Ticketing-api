const mongoose = require('mongoose');
const { User } = require('../models');
const HttpError = require('../utils/httpError');

function asObjectId(value) {
  if (!value) {
    return null;
  }
  return new mongoose.Types.ObjectId(String(value));
}

async function getTeamEmployeeIds(supervisorId, departmentId = null) {
  const query = {
    supervisorId,
    isActive: true,
  };
  if (departmentId) {
    query.departmentId = departmentId;
  }
  const employees = await User.find(query).select('_id');

  return employees.map((employee) => employee._id);
}

async function buildTicketScopeQuery(user) {
  if (['manager', 'controller', 'owner'].includes(user.role)) {
    return {};
  }

  const ownId = asObjectId(user._id);
  const departmentId = asObjectId(user.departmentId);
  const clauses = [{ assignedUserId: ownId }];

  if (departmentId) {
    clauses.push({ assignedDepartmentId: departmentId });
  }

  if (user.role === 'supervisor') {
    const teamEmployeeIds = await getTeamEmployeeIds(user._id);
    if (teamEmployeeIds.length) {
      clauses.push({ assignedUserId: { $in: teamEmployeeIds } });
    }
  }

  return { $or: clauses };
}

async function buildAssignableUsersQuery(user, departmentId = null) {
  const baseQuery = {
    isActive: true,
    role: { $in: ['employee', 'supervisor'] },
  };

  if (['manager', 'controller', 'owner'].includes(user.role)) {
    if (departmentId) {
      baseQuery.departmentId = departmentId;
    }
    return baseQuery;
  }

  if (user.role === 'supervisor') {
    const teamEmployeeIds = await getTeamEmployeeIds(user._id, user.departmentId);
    const assignableIds = [user._id, ...teamEmployeeIds];

    const peerSupervisors = await User.find({
      role: 'supervisor',
      departmentId: user.departmentId,
      isActive: true,
      _id: { $ne: user._id },
    }).select('_id');

    peerSupervisors.forEach((peer) => assignableIds.push(peer._id));

    return {
      _id: { $in: assignableIds },
      isActive: true,
      role: { $in: ['employee', 'supervisor'] },
    };
  }

  return { _id: null };
}

async function assertCanAssignUser(actor, assignedUserId, assignedDepartmentId = null) {
  if (!assignedUserId) {
    return;
  }

  const targetUser = await User.findById(assignedUserId).select('role departmentId isActive');
  if (!targetUser || !targetUser.isActive) {
    throw new HttpError(400, 'Assigned user was not found or is inactive', 'INVALID_ASSIGNEE');
  }

  if (!['employee', 'supervisor'].includes(targetUser.role)) {
    throw new HttpError(400, 'Tickets can only be assigned to employees or supervisors', 'INVALID_ASSIGNEE');
  }

  if (actor.role === 'supervisor') {
    const departmentId = assignedDepartmentId || actor.departmentId;
    if (departmentId && String(departmentId) !== String(actor.departmentId)) {
      throw new HttpError(403, 'Supervisors can assign tickets only inside their department', 'FORBIDDEN');
    }

    const assignableQuery = await buildAssignableUsersQuery(actor);
    const allowed = await User.exists({ _id: assignedUserId, ...assignableQuery });
    if (!allowed) {
      throw new HttpError(403, 'You cannot assign tickets to this user', 'FORBIDDEN');
    }
  }
}

async function canAccessTicket(user, ticket) {
  if (!ticket) {
    return false;
  }

  if (['manager', 'controller', 'owner'].includes(user.role)) {
    return true;
  }

  const assignedUserId = ticket.assignedUserId ? String(ticket.assignedUserId) : null;
  const assignedDepartmentId = ticket.assignedDepartmentId ? String(ticket.assignedDepartmentId) : null;

  if (assignedUserId && assignedUserId === String(user._id)) {
    return true;
  }

  if (assignedDepartmentId && user.departmentId && assignedDepartmentId === String(user.departmentId)) {
    return true;
  }

  if (user.role === 'supervisor' && assignedUserId) {
    const teamEmployeeIds = await getTeamEmployeeIds(user._id);
    return teamEmployeeIds.some((id) => String(id) === assignedUserId);
  }

  return false;
}

module.exports = {
  assertCanAssignUser,
  buildAssignableUsersQuery,
  buildTicketScopeQuery,
  canAccessTicket,
  getTeamEmployeeIds,
};
