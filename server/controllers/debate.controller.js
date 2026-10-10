const debateService = require("../services/debate.service");
const asyncHandler = require("../utils/asyncHandler");

const createDebate = asyncHandler(async (req, res) => {
  const debate = await debateService.createDebate(req.user._id, req.body);
  res.status(201).json({ debate });
});

const listDebates = asyncHandler(async (req, res) => {
  const result = await debateService.listDebates(req.validatedQuery);
  res.status(200).json(result);
});

const getDebateById = asyncHandler(async (req, res) => {
  const debate = await debateService.getDebateById(req.params.id, req.user?._id);
  res.status(200).json({ debate });
});

module.exports = { createDebate, listDebates, getDebateById };
