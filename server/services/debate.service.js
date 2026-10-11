const mongoose = require("mongoose");
const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const Vote = require("../models/Vote");
const ApiError = require("../utils/ApiError");

const creatorFields = "username avatar";

async function attachViewerState(debates, viewerId) {
  if (!viewerId || debates.length === 0) {
    return debates;
  }

  const debateIds = debates.map((debate) => debate._id);
  const [votes, argumentsList] = await Promise.all([
    Vote.find({ debate: { $in: debateIds }, voter: viewerId })
      .select("debate choice")
      .lean(),
    Argument.find({ debate: { $in: debateIds }, author: viewerId })
      .select("debate side")
      .lean(),
  ]);
  const votesByDebate = new Map(
    votes.map((vote) => [String(vote.debate), vote.choice])
  );
  const sidesByDebate = new Map(
    argumentsList.map((argument) => [String(argument.debate), argument.side])
  );

  return debates.map((debate) => {
    const result = debate.toObject ? debate.toObject() : debate;
    result.myVote = votesByDebate.get(String(debate._id)) || null;
    result.mySide = sidesByDebate.get(String(debate._id)) || null;
    return result;
  });
}

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
  viewerId,
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
    debates: await attachViewerState(debates, viewerId),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getDebateById(id, viewerId) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(404, "Debate not found");
  }

  const debate = await Debate.findById(id).populate("creator", creatorFields);
  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  if (!viewerId) {
    return debate;
  }

  return (await attachViewerState([debate], viewerId))[0];
}

module.exports = { createDebate, listDebates, getDebateById };
