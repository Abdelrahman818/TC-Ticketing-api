const jwt = require('jsonwebtoken');
const { User } = require('../models');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

function parseTestUser(req) {
  const raw = req.header('x-test-user');
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        ...parsed,
        _id: parsed._id || parsed.id,
      };
    }
  } catch (error) {
    return null;
  }

  return null;
}

function getBearerToken(req) {
  const authHeader = req.header('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme === 'Bearer' && token) {
    return token;
  }

  return req.cookies?.token || null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_BYPASS === 'true') {
    const testUser = parseTestUser(req);
    if (testUser && testUser._id) {
      const user = await User.findById(testUser._id);
      if (!user) {
        req.user = { _id: testUser._id, email: testUser.email, role: testUser.role || 'employee', isActive: true };
        req.authUser = {
          id: testUser._id,
          email: testUser.email,
          role: testUser.role || 'employee',
        };
        return next();
      }

      if (!user.isActive) {
        throw new HttpError(401, 'Authenticated user was not found or is inactive', 'USER_INACTIVE');
      }

      req.user = user;
      req.authUser = {
        id: user._id,
        email: user.email,
        role: user.role,
      };
      return next();
    }
  }

  const token = getBearerToken(req);

  if (token?.startsWith('dev-token:') && process.env.NODE_ENV !== 'production') {
    const email = token.replace('dev-token:', '').toLowerCase();
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      throw new HttpError(401, 'Authenticated user was not found or is inactive', 'USER_INACTIVE');
    }

    req.user = user;
    req.authUser = {
      id: user._id,
      email: user.email,
      role: user.role,
    };
    return next();
  }

  if (!token) {
    throw new HttpError(401, 'Missing bearer token', 'UNAUTHENTICATED');
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.TOKEN_SECRET_KEY || 'dev-secret-key');
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  const userId = decodedToken.userId || decodedToken.sub;
  let user = userId ? await User.findById(userId) : null;

  if (!user && decodedToken.email) {
    user = await User.findOne({ email: decodedToken.email });
  }

  if (!user || !user.isActive) {
    throw new HttpError(401, 'Authenticated user was not found or is inactive', 'USER_INACTIVE');
  }

  req.user = user;
  req.authUser = {
    id: user._id,
    email: user.email,
    role: user.role,
    ...decodedToken,
  };
  return next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const existingUsers = await User.estimatedDocumentCount();
  if (existingUsers === 0) {
    return next();
  }

  return requireAuth(req, res, next);
});

module.exports = {
  optionalAuth,
  requireAuth,
};
