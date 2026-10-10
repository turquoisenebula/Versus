const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authorization = req.get("authorization");
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return next();
  }

  let payload;
  try {
    payload = jwt.verify(match[1], env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next();
    }
    return next(error);
  }

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    return next();
  }

  const user = await User.findById(payload.sub);
  if (user) {
    req.user = user;
    req.token = match[1];
  }

  return next();
});

module.exports = optionalAuth;
