const mongoose = require("mongoose");

const argumentSchema = new mongoose.Schema(
  {
    debate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debate",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    side: {
      type: String,
      enum: ["for", "against"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1500,
    },
    upvoteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

argumentSchema.index({ debate: 1, createdAt: -1 });
argumentSchema.index({ debate: 1, side: 1 });
argumentSchema.index({ debate: 1, author: 1 });

module.exports = mongoose.model("Argument", argumentSchema);
