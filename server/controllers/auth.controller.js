const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: req.user,
    token: req.token,
  });
});

module.exports = { register, login, me };
