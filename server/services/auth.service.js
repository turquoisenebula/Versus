const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const generateToken = require("../utils/generateToken");

function toPublicUser(user) {
  const publicUser = user.toObject();
  delete publicUser.passwordHash;
  return publicUser;
}

async function register({ username, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    passwordHash,
  });

  return {
    user: toPublicUser(user),
    token: generateToken(user._id),
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  const isPasswordValid = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  return {
    user: toPublicUser(user),
    token: generateToken(user._id),
  };
}

module.exports = { register, login };
