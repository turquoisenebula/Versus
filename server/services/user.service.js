const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const publicProfileFields =
  "username avatar bio createdAt stats.debates stats.wins stats.losses stats.draws badges.bestArguments";

function toPublicProfile(user) {
  const stats = {
    debates: user.stats?.debates ?? 0,
    wins: user.stats?.wins ?? 0,
    losses: user.stats?.losses ?? 0,
    draws: user.stats?.draws ?? 0,
  };
  const completedDebates = stats.wins + stats.losses;

  return {
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt,
    stats,
    badges: {
      bestArguments: user.badges?.bestArguments ?? 0,
    },
    winRate:
      completedDebates === 0
        ? null
        : Math.round((stats.wins / completedDebates) * 100) / 100,
  };
}

async function findUserByUsername(username) {
  const user = await User.findOne({ username: username.trim().toLowerCase() })
    .select(publicProfileFields)
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}

async function getPublicProfile(username) {
  return toPublicProfile(await findUserByUsername(username));
}

function getOutcome(debate, side) {
  if (debate.status !== "closed" || !debate.statsProcessed || !debate.result) {
    return "pending";
  }
  if (debate.result === "draw") {
    return "draw";
  }
  return debate.result === side ? "won" : "lost";
}

async function getUserDebates(username, { page = 1, limit = 10, type = "all" }) {
  const user = await User.findOne({ username: username.trim().toLowerCase() })
    .select("_id")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const argumentRecords =
    type === "created"
      ? []
      : await Argument.find({ author: user._id })
          .select("debate side")
          .lean();
  const sidesByDebate = new Map();
  for (const argument of argumentRecords) {
    sidesByDebate.set(String(argument.debate), argument.side);
  }

  const filter = {};
  if (type === "created") {
    filter.creator = user._id;
  } else if (type === "argued") {
    filter._id = { $in: [...sidesByDebate.keys()] };
  } else {
    filter.$or = [
      { creator: user._id },
      { _id: { $in: [...sidesByDebate.keys()] } },
    ];
  }

  const skip = (page - 1) * limit;
  const [debates, total] = await Promise.all([
    Debate.find(filter)
      .select("title category status result endsAt voteCounts createdAt statsProcessed")
      .sort({ createdAt: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Debate.countDocuments(filter),
  ]);

  return {
    debates: debates.map((debate) => {
      const side = sidesByDebate.get(String(debate._id));
      const result = {
        id: String(debate._id),
        title: debate.title,
        category: debate.category,
        status: debate.status,
        result: debate.result,
        endsAt: debate.endsAt,
        voteCounts: debate.voteCounts,
      };
      if (side) {
        result.side = side;
        result.outcome = getOutcome(debate, side);
      }
      return result;
    }),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function updateMyProfile(userId, { bio, avatar }) {
  const updates = {};
  if (bio !== undefined) {
    updates.bio = bio;
  }
  if (avatar !== undefined) {
    updates.avatar = avatar;
  }

  const user = Object.keys(updates).length
    ? await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .select(publicProfileFields)
        .lean()
    : await User.findById(userId).select(publicProfileFields).lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return toPublicProfile(user);
}

module.exports = { getPublicProfile, getUserDebates, updateMyProfile };
