const HttpError = require('../utils/httpError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return next(
        new HttpError(
          422,
          'Validation failed',
          'VALIDATION_ERROR',
          error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
          }))
        )
      );
    }

    req[source] = value;
    return next();
  };
}

module.exports = validate;
