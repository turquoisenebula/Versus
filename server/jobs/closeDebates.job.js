const cron = require("node-cron");
const Debate = require("../models/Debate");
const { closeDebate } = require("../services/debateClose.service");

let isRunning = false;

async function runCloseDebates() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const now = new Date();
    const debates = await Debate.find({
      $or: [
        { status: "open", endsAt: { $lte: now } },
        { status: "closed", statsProcessed: false },
      ],
    })
      .select("_id")
      .sort({ endsAt: 1, _id: 1 })
      .limit(50)
      .lean();

    for (const debate of debates) {
      try {
        await closeDebate(debate._id);
      } catch (error) {
        console.error(`Failed to close debate ${debate._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to fetch debates for closing:", error);
  } finally {
    isRunning = false;
  }
}

function startCloseDebatesJob() {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  return cron.schedule("* * * * *", runCloseDebates);
}

module.exports = { startCloseDebatesJob };
