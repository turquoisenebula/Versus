const argumentService = require("../services/argument.service");
const asyncHandler = require("../utils/asyncHandler");

const createArgument = asyncHandler(async (req, res) => {
  const argument = await argumentService.createArgument(
    req.user._id,
    req.params.id,
    req.body
  );
  res.status(201).json({ argument });
});

const listArguments = asyncHandler(async (req, res) => {
  const result = await argumentService.listArguments(
    req.params.id,
    req.validatedQuery
  );

  if (req.user) {
    result.mySide = await argumentService.getMySide(req.user._id, req.params.id);
  }

  res.status(200).json(result);
});

module.exports = { createArgument, listArguments };
