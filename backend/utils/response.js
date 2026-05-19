const ok = (res, data = null, message = 'OK', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const fail = (res, message = 'Error', errorCode = 'INTERNAL_ERROR', status = 500, errors = undefined) => {
  const payload = {
    success: false,
    message,
    errorCode,
  };
  if (errors) payload.errors = errors;
  return res.status(status).json(payload);
};

module.exports = { ok, fail };
