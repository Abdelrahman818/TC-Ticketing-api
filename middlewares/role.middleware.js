const HttpError = require('../utils/httpError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required', 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to access this resource', 'FORBIDDEN'));
    }

    return next();
  };
}

module.exports = {
  authorize,
};
