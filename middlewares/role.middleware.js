const HttpError = require('../utils/httpError');

function authorize(...allowedRoles) {
  const effectiveRoles = new Set(allowedRoles);
  if (effectiveRoles.has('controller')) {
    effectiveRoles.add('owner');
  }

  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required', 'UNAUTHENTICATED'));
    }

    if (!effectiveRoles.has(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to access this resource', 'FORBIDDEN'));
    }

    return next();
  };
}

module.exports = {
  authorize,
};
