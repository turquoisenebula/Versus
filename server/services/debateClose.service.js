const mongoose = require("mongoose");
const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const User = require("../models/User");
const Vote = require("../models/Vote");

async function closeDebate(debateId) {
  const session = await mongoose.startSession();
  const now = new Date();

  try {
    return await session.withTransaction(async () => {
      const debate = await Debate.findOneAndUpdate(
        {
          _id: debateId,
          statsProcessed: false,
          $or: [
            { status: "open", endsAt: { $lte: now } },
            { status: "closed" },
          ],
        },
        { $set: { statsProcessed: true } },
        { new: true, session }
      )
        .select("_id")
        .lean();

      if (!debate) {
        return { skipped: true };
      }

      const voteGroups = await Vote.aggregate([
        { $match: { debate: debate._id } },
        { $group: { _id: "$choice", count: { $sum: 1 } } },
      ]).session(session);
      const voteCounts = { for: 0, against: 0, neutral: 0 };
      for (const group of voteGroups) {
        voteCounts[group._id] = group.count;
      }

      const result =
        voteCounts.for > voteCounts.against
          ? "for"
          : voteCounts.against > voteCounts.for
            ? "against"
            : "draw";

      const arguers = await Argument.aggregate([
        { $match: { debate: debate._id } },
        {
          $group: {
            _id: "$author",
            side: { $first: "$side" },
          },
        },
      ]).session(session);

      if (arguers.length > 0) {
        await User.bulkWrite(
          arguers.map((arguer) => ({
            updateOne: {
              filter: { _id: arguer._id },
              update: {
                $inc: {
                  "stats.debates": 1,
                  [result === "draw"
                    ? "stats.draws"
                    : arguer.side === result
                      ? "stats.wins"
                      : "stats.losses"]: 1,
                },
              },
            },
          })),
          { session }
        );
      }

      let bestArgument = null;
      if (result !== "draw") {
        const winner = await Argument.findOne({
          debate: debate._id,
          side: result,
          upvoteCount: { $gte: 1 },
        })
          .sort({ upvoteCount: -1, createdAt: 1, _id: 1 })
          .select("_id author")
          .session(session)
          .lean();

        if (winner) {
          bestArgument = winner._id;
          await User.updateOne(
            { _id: winner.author },
            { $inc: { "badges.bestArguments": 1 } },
            { session }
          );
        }
      }

      await Debate.updateOne(
        { _id: debate._id },
        {
          $set: {
            status: "closed",
            result,
            voteCounts,
            bestArgument,
            statsProcessed: true,
          },
        },
        { session }
      );

      return { closed: true, result, arguers: arguers.length, bestArgument };
    });
  } finally {
    await session.endSession();
  }
}

module.exports = { closeDebate };
