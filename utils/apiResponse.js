function success(res, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, statusCode, message, code = 'ERROR', details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
}

module.exports = {
  success,
  error,
};
