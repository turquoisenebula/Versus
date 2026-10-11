const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");

const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await userService.getPublicProfile(req.params.username);
  res.status(200).json({ user });
});

const getUserDebates = asyncHandler(async (req, res) => {
  const result = await userService.getUserDebates(
    req.params.username,
    req.validatedQuery
  );
  res.status(200).json(result);
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateMyProfile(req.user._id, req.body);
  res.status(200).json({ user });
});

module.exports = { getPublicProfile, getUserDebates, updateMyProfile };
