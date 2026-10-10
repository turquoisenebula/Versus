const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function readBearerToken(req) {
  const authorization = req.get("authorization");
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

const auth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    return next(error);
  }

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    return next(new ApiError(401, "Invalid or expired token"));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(new ApiError(401, "Invalid or expired token"));
  }

  req.user = user;
  req.token = token;
  return next();
});

module.exports = auth;
