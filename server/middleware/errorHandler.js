function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyPattern || err.keyValue || {});
    const field = duplicateFields.find((key) =>
      ["username", "email"].includes(key)
    );
    const messages = {
      username: "That username is already taken.",
      email: "That email is already registered.",
    };

    if (field) {
      return res.status(409).json({
        success: false,
        message: messages[field],
      });
    }
  }

  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Internal server error" : err.message,
  });
}

module.exports = errorHandler;
