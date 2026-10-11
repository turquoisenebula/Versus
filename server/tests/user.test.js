const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const User = require("../models/User");
const { getPublicProfile, getUserDebates } = require("../services/user.service");

jest.setTimeout(120000);

let replicaSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replicaSet.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet.stop();
});

beforeEach(async () => {
  await Promise.all([
    Argument.deleteMany({}),
    Debate.deleteMany({}),
    User.deleteMany({}),
  ]);
});

async function createUser(username, stats = {}) {
  return User.create({
    username,
    email: `${username}@example.com`,
    passwordHash: "x".repeat(60),
    stats,
  });
}

describe("user service", () => {
  describe("getPublicProfile winRate", () => {
    test("returns null when the user has no wins or losses, even with draws", async () => {
      await createUser("profile_zero", {
        debates: 5,
        wins: 0,
        losses: 0,
        draws: 5,
      });

      const profile = await getPublicProfile("profile_zero");

      expect(profile.winRate).toBeNull();
      expect(profile.stats.draws).toBe(5);
    });

    test("calculates win rate from wins and losses, excluding draws", async () => {
      await createUser("profile_rate", {
        debates: 13,
        wins: 3,
        losses: 1,
        draws: 9,
      });

      const profile = await getPublicProfile("profile_rate");

      expect(profile.winRate).toBe(0.75);
      expect(profile).not.toHaveProperty("email");
      expect(profile).not.toHaveProperty("passwordHash");
      expect(profile).not.toHaveProperty("_id");
    });
  });

  describe("getUserDebates outcomes", () => {
    test("returns won, lost, draw, and pending outcomes for argued debates", async () => {
      const arguer = await createUser("outcome_arguer");
      const states = [
        { status: "closed", result: "for", statsProcessed: true, outcome: "won" },
        { status: "closed", result: "against", statsProcessed: true, outcome: "lost" },
        { status: "closed", result: "draw", statsProcessed: true, outcome: "draw" },
        { status: "open", result: null, statsProcessed: false, outcome: "pending" },
        { status: "closed", result: "for", statsProcessed: false, outcome: "pending" },
      ];

      for (const [index, state] of states.entries()) {
        const debate = await Debate.create({
          title: `Outcome test debate ${index}`,
          description: "A sufficiently long debate description for outcome testing.",
          category: "technology",
          creator: arguer._id,
          endsAt: new Date(Date.now() + 60 * 60 * 1000),
          status: state.status,
          result: state.result,
          statsProcessed: state.statsProcessed,
        });
        await Argument.create({
          debate: debate._id,
          author: arguer._id,
          side: "for",
          text: "A sufficiently detailed test argument.",
        });
      }

      const result = await getUserDebates("outcome_arguer", { type: "argued" });
      const outcomeCounts = result.debates.reduce((counts, debate) => {
        counts[debate.outcome] = (counts[debate.outcome] || 0) + 1;
        return counts;
      }, {});

      expect(result.debates).toHaveLength(states.length);
      expect(outcomeCounts).toEqual({
        won: 1,
        lost: 1,
        draw: 1,
        pending: 2,
      });
      expect(result.debates.every((debate) => debate.side === "for")).toBe(true);
    });
  });
});
