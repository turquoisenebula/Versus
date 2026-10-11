const mongoose = require("mongoose");
const Debate = require("../models/Debate");
const Vote = require("../models/Vote");
const ApiError = require("../utils/ApiError");

function toDebateObjectId(debateId) {
  if (!mongoose.isObjectIdOrHexString(debateId)) {
    throw new ApiError(404, "Debate not found");
  }

  return new mongoose.Types.ObjectId(debateId);
}

async function findOpenDebate(debateObjectId) {
  const debate = await Debate.findById(debateObjectId)
    .select("status endsAt voteCounts")
    .lean();

  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  if (debate.status === "closed" || debate.endsAt.getTime() <= Date.now()) {
    throw new ApiError(403, "This debate is closed");
  }

  return debate;
}

async function getState(debateObjectId, voterId) {
  const [debate, vote] = await Promise.all([
    Debate.findById(debateObjectId).select("voteCounts").lean(),
    Vote.findOne({ debate: debateObjectId, voter: voterId })
      .select("choice")
      .lean(),
  ]);
  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  return {
    myVote: vote?.choice || null,
    voteCounts: debate.voteCounts,
  };
}

async function castVote(userId, debateId, choice) {
  const debateObjectId = toDebateObjectId(debateId);
  const voterId = new mongoose.Types.ObjectId(userId);

  await findOpenDebate(debateObjectId);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const existingVote = await Vote.findOne({
      debate: debateObjectId,
      voter: voterId,
    })
      .select("_id choice")
      .lean();

    if (!existingVote) {
      try {
        await Vote.create({ debate: debateObjectId, voter: voterId, choice });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
        continue;
      }

      const updatedDebate = await Debate.findOneAndUpdate(
        {
          _id: debateObjectId,
          status: "open",
          endsAt: { $gt: new Date() },
        },
        { $inc: { [`voteCounts.${choice}`]: 1 } },
        { new: true }
      )
        .select("voteCounts")
        .lean();

      if (updatedDebate) {
        return getState(debateObjectId, voterId);
      }

      await Vote.deleteOne({ debate: debateObjectId, voter: voterId, choice });
      await findOpenDebate(debateObjectId);
    }

    if (existingVote && existingVote.choice === choice) {
      await findOpenDebate(debateObjectId);
      return getState(debateObjectId, voterId);
    }

    if (existingVote) {
      const changedVote = await Vote.findOneAndUpdate(
        { _id: existingVote._id, choice: existingVote.choice },
        { $set: { choice } },
        { new: true }
      )
        .select("_id")
        .lean();

      if (!changedVote) {
        continue;
      }

      const updatedDebate = await Debate.findOneAndUpdate(
        {
          _id: debateObjectId,
          status: "open",
          endsAt: { $gt: new Date() },
          [`voteCounts.${existingVote.choice}`]: { $gte: 1 },
        },
        {
          $inc: {
            [`voteCounts.${existingVote.choice}`]: -1,
            [`voteCounts.${choice}`]: 1,
          },
        },
        { new: true }
      )
        .select("voteCounts")
        .lean();

      if (updatedDebate) {
        return getState(debateObjectId, voterId);
      }

      await Vote.updateOne(
        { _id: changedVote._id, choice },
        { $set: { choice: existingVote.choice } }
      );
      await findOpenDebate(debateObjectId);
      await new Promise((resolve) => setTimeout(resolve, 5));
      continue;
    }
  }

  throw new ApiError(409, "Vote changed concurrently; please try again");
}

async function removeVote(userId, debateId) {
  const debateObjectId = toDebateObjectId(debateId);
  const voterId = new mongoose.Types.ObjectId(userId);

  await findOpenDebate(debateObjectId);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const vote = await Vote.findOne({ debate: debateObjectId, voter: voterId })
      .select("_id choice")
      .lean();
    if (!vote) {
      throw new ApiError(404, "Vote not found");
    }

    const decrementedDebate = await Debate.findOneAndUpdate(
      {
        _id: debateObjectId,
        status: "open",
        endsAt: { $gt: new Date() },
        [`voteCounts.${vote.choice}`]: { $gte: 1 },
      },
      { $inc: { [`voteCounts.${vote.choice}`]: -1 } },
      { new: true }
    )
      .select("voteCounts")
      .lean();

    if (!decrementedDebate) {
      await findOpenDebate(debateObjectId);
      throw new ApiError(409, "Vote counts are inconsistent");
    }

    const deletedVote = await Vote.findOneAndDelete({
      _id: vote._id,
      choice: vote.choice,
    });
    if (deletedVote) {
      return { myVote: null, voteCounts: decrementedDebate.voteCounts };
    }

    const restoredDebate = await Debate.findByIdAndUpdate(
      debateObjectId,
      { $inc: { [`voteCounts.${vote.choice}`]: 1 } },
      { new: true }
    )
      .select("voteCounts")
      .lean();
    if (!restoredDebate) {
      throw new ApiError(404, "Debate not found");
    }
  }

  throw new ApiError(409, "Vote changed concurrently; please try again");
}

async function getMyVote(userId, debateId) {
  const debateObjectId = toDebateObjectId(debateId);
  const debateExists = await Debate.exists({ _id: debateObjectId });
  if (!debateExists) {
    throw new ApiError(404, "Debate not found");
  }

  const vote = await Vote.findOne({
    debate: debateObjectId,
    voter: userId,
  })
    .select("choice")
    .lean();

  return vote ? vote.choice : null;
}

module.exports = { castVote, removeVote, getMyVote };
