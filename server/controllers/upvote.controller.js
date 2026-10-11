const upvoteService = require("../services/upvote.service");
const asyncHandler = require("../utils/asyncHandler");

const toggleUpvote = asyncHandler(async (req, res) => {
  const result = await upvoteService.toggleUpvote(req.user._id, req.params.id);
  res.status(200).json(result);
});

module.exports = { toggleUpvote };
