const mongoose = require("mongoose");
const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const ApiError = require("../utils/ApiError");

const authorFields = "username avatar";
const maxArgumentsPerUser = 5;

function toObjectId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(404, "Debate not found");
  }

  return new mongoose.Types.ObjectId(id);
}

async function createArgument(userId, debateId, { side, text }) {
  const debateObjectId = toObjectId(debateId);
  const debate = await Debate.findById(debateObjectId);

  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  if (debate.status === "closed" || debate.endsAt.getTime() <= Date.now()) {
    throw new ApiError(403, "This debate is closed");
  }

  const existingArguments = await Argument.find({
    debate: debateObjectId,
    author: userId,
  })
    .select("side")
    .lean();

  if (existingArguments.some((argument) => argument.side !== side)) {
    throw new ApiError(
      409,
      "You have already argued the other side of this debate"
    );
  }

  if (existingArguments.length >= maxArgumentsPerUser) {
    throw new ApiError(429, "You can post at most 5 arguments per debate");
  }

  const argument = await Argument.create({
    debate: debateObjectId,
    author: userId,
    side,
    text,
  });

  return argument.populate("author", authorFields);
}

async function listArguments(
  debateId,
  { page = 1, limit = 10, side, sort = "newest" } = {}
) {
  const debateObjectId = toObjectId(debateId);
  const debateExists = await Debate.exists({ _id: debateObjectId });
  if (!debateExists) {
    throw new ApiError(404, "Debate not found");
  }

  const filter = { debate: debateObjectId };
  if (side) {
    filter.side = side;
  }

  const sortOrder =
    sort === "top"
      ? { upvoteCount: -1, createdAt: 1, _id: 1 }
      : sort === "oldest"
        ? { createdAt: 1, _id: 1 }
        : { createdAt: -1, _id: 1 };
  const skip = (page - 1) * limit;
  const [total, argumentsList] = await Promise.all([
    Argument.countDocuments(filter),
    Argument.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate("author", authorFields)
      .lean(),
  ]);

  return {
    arguments: argumentsList,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getMySide(userId, debateId) {
  const debateObjectId = toObjectId(debateId);
  const argument = await Argument.findOne({
    debate: debateObjectId,
    author: userId,
  })
    .select("side")
    .lean();

  return argument ? argument.side : null;
}

module.exports = { createArgument, listArguments, getMySide };
