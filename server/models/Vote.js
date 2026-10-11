const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    debate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debate",
      required: true,
    },
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    choice: {
      type: String,
      enum: ["for", "against", "neutral"],
      required: true,
    },
  },
  { timestamps: true }
);

voteSchema.index({ debate: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
