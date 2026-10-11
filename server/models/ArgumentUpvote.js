const mongoose = require("mongoose");

const argumentUpvoteSchema = new mongoose.Schema(
  {
    argument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Argument",
      required: true,
    },
    debate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debate",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

argumentUpvoteSchema.index({ argument: 1, user: 1 }, { unique: true });
argumentUpvoteSchema.index({ debate: 1, user: 1 });

module.exports = mongoose.model("ArgumentUpvote", argumentUpvoteSchema);
