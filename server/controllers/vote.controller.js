const voteService = require("../services/vote.service");
const asyncHandler = require("../utils/asyncHandler");

const castVote = asyncHandler(async (req, res) => {
  const result = await voteService.castVote(
    req.user._id,
    req.params.id,
    req.body.choice
  );
  res.status(200).json(result);
});

const removeVote = asyncHandler(async (req, res) => {
  const result = await voteService.removeVote(req.user._id, req.params.id);
  res.status(200).json(result);
});

const getMyVote = asyncHandler(async (req, res) => {
  const myVote = await voteService.getMyVote(req.user._id, req.params.id);
  res.status(200).json({ myVote });
});

module.exports = { castVote, removeVote, getMyVote };
