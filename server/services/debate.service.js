const mongoose = require("mongoose");
const Debate = require("../models/Debate");
const ApiError = require("../utils/ApiError");

const creatorFields = "username avatar";

async function createDebate(userId, data) {
  const debate = await Debate.create({
    ...data,
    creator: userId,
  });

  return debate.populate("creator", creatorFields);
}

async function listDebates({
  page = 1,
  limit = 10,
  search,
  category,
  status,
  sort = "newest",
}) {
  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    filter.category = category;
  }
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const total = await Debate.countDocuments(filter);

  let debates;
  if (sort === "most-votes") {
    debates = await Debate.aggregate([
      { $match: filter },
      {
        $addFields: {
          totalVotes: {
            $add: [
              "$voteCounts.for",
              "$voteCounts.against",
              "$voteCounts.neutral",
            ],
          },
        },
      },
      { $sort: { totalVotes: -1, createdAt: -1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          pipeline: [{ $project: { username: 1, avatar: 1 } }],
          as: "creator",
        },
      },
      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $project: { totalVotes: 0 } },
    ]);
  } else {
    const sortOrder =
      sort === "ending-soon" ? { endsAt: 1, _id: 1 } : { createdAt: -1, _id: 1 };

    debates = await Debate.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate("creator", creatorFields);
  }

  return {
    debates,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getDebateById(id, _viewerId) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(404, "Debate not found");
  }

  const debate = await Debate.findById(id).populate("creator", creatorFields);
  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  return debate;
}

module.exports = { createDebate, listDebates, getDebateById };
