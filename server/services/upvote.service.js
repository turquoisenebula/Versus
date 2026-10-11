const mongoose = require("mongoose");
const Argument = require("../models/Argument");
const ArgumentUpvote = require("../models/ArgumentUpvote");
const Debate = require("../models/Debate");
const ApiError = require("../utils/ApiError");

function toArgumentObjectId(argumentId) {
  if (!mongoose.isObjectIdOrHexString(argumentId)) {
    throw new ApiError(404, "Argument not found");
  }

  return new mongoose.Types.ObjectId(argumentId);
}

async function findOpenDebate(debateId) {
  const debate = await Debate.findById(debateId)
    .select("status endsAt")
    .lean();

  if (!debate) {
    throw new ApiError(404, "Debate not found");
  }

  if (debate.status === "closed" || debate.endsAt.getTime() <= Date.now()) {
    throw new ApiError(403, "This debate is closed");
  }
}

async function toggleUpvote(userId, argumentId) {
  const argumentObjectId = toArgumentObjectId(argumentId);
  const argument = await Argument.findById(argumentObjectId)
    .select("debate author")
    .lean();

  if (!argument) {
    throw new ApiError(404, "Argument not found");
  }

  await findOpenDebate(argument.debate);

  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (argument.author.equals(userObjectId)) {
    throw new ApiError(403, "You can't upvote your own argument");
  }

  const session = await mongoose.startSession();

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await session.withTransaction(async () => {
          const openDebate = await Debate.findOne({
            _id: argument.debate,
            status: "open",
            endsAt: { $gt: new Date() },
          })
            .select("_id")
            .session(session)
            .lean();
          if (!openDebate) {
            throw new ApiError(403, "This debate is closed");
          }

          const existingUpvote = await ArgumentUpvote.findOne({
            argument: argumentObjectId,
            user: userObjectId,
          })
            .select("_id")
            .session(session)
            .lean();

          if (existingUpvote) {
            const deletedUpvote = await ArgumentUpvote.deleteOne(
              { _id: existingUpvote._id },
              { session }
            );
            if (deletedUpvote.deletedCount !== 1) {
              throw new ApiError(
                409,
                "Upvote changed concurrently; please try again"
              );
            }

            const updatedArgument = await Argument.findOneAndUpdate(
              { _id: argumentObjectId, upvoteCount: { $gte: 1 } },
              { $inc: { upvoteCount: -1 } },
              { new: true, session }
            )
              .select("upvoteCount")
              .lean();

            if (!updatedArgument) {
              throw new ApiError(409, "Argument upvote count is inconsistent");
            }

            return {
              upvoted: false,
              upvoteCount: updatedArgument.upvoteCount,
            };
          }

          await ArgumentUpvote.create(
            [
              {
                argument: argumentObjectId,
                debate: argument.debate,
                user: userObjectId,
              },
            ],
            { session }
          );

          const updatedArgument = await Argument.findByIdAndUpdate(
            argumentObjectId,
            { $inc: { upvoteCount: 1 } },
            { new: true, session }
          )
            .select("upvoteCount")
            .lean();

          if (!updatedArgument) {
            throw new ApiError(404, "Argument not found");
          }

          return {
            upvoted: true,
            upvoteCount: updatedArgument.upvoteCount,
          };
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    throw new ApiError(409, "Upvote changed concurrently; please try again");
  } finally {
    await session.endSession();
  }
}

module.exports = { toggleUpvote };
