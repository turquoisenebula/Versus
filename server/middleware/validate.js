function validate(schema, source = "body") {
  if (source !== "body" && source !== "query") {
    throw new TypeError('Validation source must be "body" or "query"');
  }

  return function validateRequest(req, res, next) {
    const result = schema.safeParse(source === "body" ? req.body : req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Request validation failed",
        errors,
      });
    }

    if (source === "body") {
      req.body = result.data;
    } else {
      req.validatedQuery = result.data;
    }
    return next();
  };
}

module.exports = validate;
