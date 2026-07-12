const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { writeAuditLog } = require('../utils/audit');
const HttpError = require('../utils/httpError');
const jwt = require('jsonwebtoken');

const syncProfile = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new HttpError(400, 'Email is required', 'VALIDATION_ERROR');
  }

  const name = req.body.name?.trim();
  if (!name) {
    throw new HttpError(400, 'Name is required', 'VALIDATION_ERROR');
  }

  let existingUser = req.user && typeof req.user.save === 'function' ? req.user : null;

  if (!existingUser && req.user?._id) {
    existingUser = await User.findById(req.user._id);
  }

  if (!existingUser) {
    existingUser = await User.findOne({ email: normalizedEmail });
  }

  if (existingUser) {
    existingUser.name = name;
    existingUser.email = normalizedEmail;
    if (req.body.departmentId !== undefined) existingUser.departmentId = req.body.departmentId;
    if (req.body.supervisorId !== undefined) existingUser.supervisorId = req.body.supervisorId;
    await existingUser.save();
    return success(res, 'User profile synced successfully', { user: existingUser });
  }

  try {
    const user = await User.create({
      name,
      email: normalizedEmail,
      role: 'employee',
      departmentId: req.body.departmentId || null,
      supervisorId: req.body.supervisorId || null,
    });

    return success(res, 'User profile synced successfully', { user }, 201);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateUser = await User.findOne({ email: normalizedEmail });
      if (duplicateUser) {
        duplicateUser.name = name;
        duplicateUser.email = normalizedEmail;
        if (req.body.departmentId !== undefined) duplicateUser.departmentId = req.body.departmentId;
        if (req.body.supervisorId !== undefined) duplicateUser.supervisorId = req.body.supervisorId;
        await duplicateUser.save();
        return success(res, 'User profile synced successfully', { user: duplicateUser });
      }
    }

    throw error;
  }
});

const createUser = asyncHandler(async (req, res) => {
  const existingUsers = await User.countDocuments();
  const isBootstrapOwner = existingUsers === 0 && req.body.role === 'owner';

  if (!isBootstrapOwner && (!req.user || req.user.role !== 'owner')) {
    throw new HttpError(403, 'Only owner can create users', 'FORBIDDEN');
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    departmentId: req.body.departmentId || null,
    supervisorId: req.body.supervisorId || null,
    isActive: req.body.isActive,
  });

  if (req.user) {
    await writeAuditLog({
      actorId: req.user._id,
      action: 'user_created',
      entityType: 'user',
      entityId: user._id,
      after: user.toObject(),
    });
  }

  return success(res, 'User created successfully', { user }, 201);
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return success(res, 'Current user fetched successfully', { user: req.user });
});

const logout = asyncHandler(async (req, res) => {
  return success(res, 'Logout successful');
});

const devLogin = asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const password = req.body?.password;

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  if (password.length < 4) {
    throw new HttpError(400, 'Password must be at least 4 characters', 'VALIDATION_ERROR');
  }

  let user = await User.findOne({ email });

  if (!user) {
    const existingUsers = await User.countDocuments();
    user = await User.create({
      name: email.split('@')[0],
      email,
      role: existingUsers === 0 ? 'owner' : 'employee',
    });
  }

  const token = `dev-token:${email}`;

  return success(res, 'Signed in successfully', { token, user });
});

const devRegister = asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase();
  const password = req.body?.password;
  const name = req.body?.name?.trim();

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  if (password.length < 4) {
    throw new HttpError(400, 'Password must be at least 4 characters', 'VALIDATION_ERROR');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new HttpError(409, 'A user with that email already exists', 'USER_EXISTS');
  }

  const existingUsers = await User.countDocuments();
  const user = await User.create({
    name: name || email.split('@')[0],
    email,
    role: existingUsers === 0 ? 'owner' : 'employee',
  });

  return success(res, 'Account created successfully', { token: `dev-token:${email}`, user }, 201);
});

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return error(res, 401, 'Email is not found');
  }

  const payload = {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
    dept: user.departmentId || null,
  };
  const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY || 'dev-secret-key', { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return success(res, 'Logged in successfully', { token, user }, 200);
};

const signup = async (req, res) => {
  const { name, email, password, dept } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return error(res, 401, 'Email already exists.');
  }

  const existingUsers = await User.countDocuments();
  const assignedRole = existingUsers === 0 ? 'owner' : 'employee';

  const newUser = await User.create({
    name,
    email,
    role: assignedRole,
    departmentId: dept || null,
  });

  const payload = {
    userId: newUser._id,
    userName: newUser.name,
    email: newUser.email,
    role: newUser.role,
    dept: newUser.departmentId || null,
  };
  const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY || 'dev-secret-key', { expiresIn: '7d' });
  return success(res, 'Account created successfully', { token, user: newUser }, 201);
};

module.exports = {
  createUser,
  devLogin,
  devRegister,
  getCurrentUser,
  logout,
  syncProfile,
  login,
  signup,
};
