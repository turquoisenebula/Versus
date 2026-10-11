const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Debate = require("../models/Debate");
const { closeDebate } = require("../services/debateClose.service");

async function closeDueDebatesOnce() {
  await connectDB();

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
      await closeDebate(debate._id);
    }
  } finally {
    await mongoose.disconnect();
  }
}

closeDueDebatesOnce().catch((error) => {
  console.error("Failed to close debates:", error);
  process.exitCode = 1;
});
