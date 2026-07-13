const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const HttpError = require('../utils/httpError');
const { writeAuditLog } = require('../utils/audit');
const { buildAssignableUsersQuery } = require('../services/access.service');
const bcrypt = require('bcryptjs');

function buildUserFilters(query) {
  const filters = {};
  if (query.role) filters.role = query.role;
  if (query.departmentId) filters.departmentId = query.departmentId;
  if (query.supervisorId) filters.supervisorId = query.supervisorId;
  if (query.isActive !== undefined) filters.isActive = query.isActive;
  if (query.search) {
    const searchValue = String(query.search).trim();
    const searchConditions = [
      { name: { $regex: searchValue, $options: 'i' } },
      { email: { $regex: searchValue, $options: 'i' } },
    ];

    if (searchValue.match(/^[a-fA-F0-9]{24}$/)) {
      searchConditions.push({ _id: searchValue });
    }

    filters.$or = searchConditions;
  }
  return filters;
}

const getAssignableUsers = asyncHandler(async (req, res) => {
  if (!['supervisor', 'manager', 'controller', 'owner'].includes(req.user.role)) {
    throw new HttpError(403, 'You do not have permission to list assignable users', 'FORBIDDEN');
  }

  const filters = await buildAssignableUsersQuery(req.user, req.query.departmentId || null);
  const users = await User.find(filters)
    .select('name email role departmentId')
    .populate('departmentId', 'name')
    .sort({ role: 1, name: 1 });

  return success(res, 'Assignable users fetched successfully', { users });
});

const getUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;
  const filters = buildUserFilters(req.query);

  const [items, totalItems] = await Promise.all([
    User.find(filters)
      .select('-__v')
      .populate('departmentId', 'name')
      .populate('supervisorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filters),
  ]);

  return success(res, 'Users fetched successfully', {
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

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId)
    .populate('departmentId', 'name')
    .populate('supervisorId', 'name email role');
  if (!user) {
    throw new HttpError(404, 'User was not found', 'USER_NOT_FOUND');
  }
  return success(res, 'User fetched successfully', { user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new HttpError(404, 'User was not found', 'USER_NOT_FOUND');
  }

  const before = user.toObject();
  const updates = { ...req.body };

  if (updates.password) {
    if (String(updates.password).length < 4) {
      throw new HttpError(400, 'Password must be at least 4 characters', 'VALIDATION_ERROR');
    }
    updates.passwordHash = await bcrypt.hash(String(updates.password), 10);
    delete updates.password;
  }

  Object.assign(user, updates);
  await user.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'user_updated',
    entityType: 'user',
    entityId: user._id,
    before,
    after: user.toObject(),
  });

  return success(res, 'User updated successfully', { user });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new HttpError(404, 'User was not found', 'USER_NOT_FOUND');
  }

  const before = { role: user.role };
  user.role = req.body.role;
  await user.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'role_updated',
    entityType: 'user',
    entityId: user._id,
    before,
    after: { role: user.role },
  });

  return success(res, 'User role updated successfully', { user });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new HttpError(404, 'User was not found', 'USER_NOT_FOUND');
  }

  const before = user.toObject();
  user.isActive = false;
  await user.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'user_deactivated',
    entityType: 'user',
    entityId: user._id,
    before,
    after: user.toObject(),
  });

  return success(res, 'User deactivated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new HttpError(404, 'User was not found', 'USER_NOT_FOUND');
  }

  const before = user.toObject();
  await User.deleteOne({ _id: user._id });

  await writeAuditLog({
    actorId: req.user._id,
    action: 'user_deleted',
    entityType: 'user',
    entityId: user._id,
    before,
    after: null,
  });

  return success(res, 'User deleted successfully');
});

module.exports = {
  deactivateUser,
  deleteUser,
  getAssignableUsers,
  getUserById,
  getUsers,
  updateUser,
  updateUserRole,
};
