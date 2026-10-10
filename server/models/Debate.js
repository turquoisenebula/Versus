const mongoose = require("mongoose");
const categories = require("../utils/debateCategories");

const debateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: categories,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator(endsAt) {
          if (!this.isNew) {
            return true;
          }

          const now = Date.now();
          const maxEnd = now + 30 * 24 * 60 * 60 * 1000;
          return endsAt.getTime() > now && endsAt.getTime() <= maxEnd;
        },
        message: "Debate end time must be in the future and within 30 days",
      },
    },
    voteCounts: {
      for: { type: Number, default: 0 },
      against: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
    },
    result: {
      type: String,
      enum: ["for", "against", "draw", null],
      default: null,
    },
    statsProcessed: {
      type: Boolean,
      default: false,
    },
    bestArgument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Argument",
      default: null,
    },
  },
  { timestamps: true }
);

debateSchema.index({ status: 1 });
debateSchema.index({ category: 1 });
debateSchema.index({ createdAt: 1 });
debateSchema.index({ endsAt: 1 });
debateSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Debate", debateSchema);
