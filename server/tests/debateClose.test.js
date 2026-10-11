const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Argument = require("../models/Argument");
const Debate = require("../models/Debate");
const User = require("../models/User");
const Vote = require("../models/Vote");
const { createArgument } = require("../services/argument.service");
const { closeDebate } = require("../services/debateClose.service");
const { getDebateById } = require("../services/debate.service");
const { castVote } = require("../services/vote.service");

jest.setTimeout(120000);

let replicaSet;
let userIndex = 0;

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
    Vote.deleteMany({}),
  ]);
});

async function createUser() {
  userIndex += 1;
  return User.create({
    username: `user_${userIndex}`,
    email: `user_${userIndex}@example.com`,
    passwordHash: "x".repeat(60),
  });
}

async function createDebate({ due = true } = {}) {
  const creator = await createUser();
  const debate = await Debate.create({
    title: "A sufficiently long debate title",
    description: "A sufficiently long debate description for this test.",
    category: "technology",
    creator: creator._id,
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  if (due) {
    await Debate.updateOne(
      { _id: debate._id },
      { $set: { endsAt: new Date(Date.now() - 1000) } }
    );
  }

  return debate;
}

async function addArgument(debate, author, side, options = {}) {
  const argument = await Argument.create({
    debate: debate._id,
    author: author._id,
    side,
    text: options.text || `A valid argument from ${author.username} ${side}.`,
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
  });

  if (options.upvoteCount !== undefined) {
    await Argument.updateOne(
      { _id: argument._id },
      { $set: { upvoteCount: options.upvoteCount } }
    );
  }

  return argument;
}

async function addVotes(debate, choices) {
  for (const choice of choices) {
    const voter = await createUser();
    await Vote.create({ debate: debate._id, voter: voter._id, choice });
  }
}

async function stats(user) {
  return User.findById(user._id).select("stats badges").lean();
}

describe("closeDebate", () => {
  test("awards wins to for-side arguers and losses to against-side arguers", async () => {
    const debate = await createDebate();
    const forUser = await createUser();
    const againstUser = await createUser();
    await addArgument(debate, forUser, "for");
    await addArgument(debate, againstUser, "against");
    await addVotes(debate, ["for", "for", "against"]);

    const result = await closeDebate(debate._id);

    expect(result).toMatchObject({ closed: true, result: "for", arguers: 2 });
    expect((await stats(forUser)).stats).toMatchObject({
      debates: 1,
      wins: 1,
      losses: 0,
      draws: 0,
    });
    expect((await stats(againstUser)).stats).toMatchObject({
      debates: 1,
      wins: 0,
      losses: 1,
      draws: 0,
    });
  });

  test("awards wins to against-side arguers and losses to for-side arguers", async () => {
    const debate = await createDebate();
    const forUser = await createUser();
    const againstUser = await createUser();
    await addArgument(debate, forUser, "for");
    await addArgument(debate, againstUser, "against");
    await addVotes(debate, ["against", "against", "for"]);

    await closeDebate(debate._id);

    expect((await stats(forUser)).stats).toMatchObject({
      debates: 1,
      wins: 0,
      losses: 1,
      draws: 0,
    });
    expect((await stats(againstUser)).stats).toMatchObject({
      debates: 1,
      wins: 1,
      losses: 0,
      draws: 0,
    });
  });

  test.each([
    ["tied votes", ["for", "against"]],
    ["zero votes", []],
  ])("records a draw for %s", async (_label, votes) => {
    const debate = await createDebate();
    const forUser = await createUser();
    const againstUser = await createUser();
    await addArgument(debate, forUser, "for");
    await addArgument(debate, againstUser, "against");
    await addVotes(debate, votes);

    const result = await closeDebate(debate._id);

    expect(result).toMatchObject({
      closed: true,
      result: "draw",
      bestArgument: null,
    });
    expect((await stats(forUser)).stats).toMatchObject({
      debates: 1,
      wins: 0,
      losses: 0,
      draws: 1,
    });
    expect((await stats(againstUser)).stats).toMatchObject({
      debates: 1,
      wins: 0,
      losses: 0,
      draws: 1,
    });
  });

  test("ignores neutral votes when deciding the result", async () => {
    const debate = await createDebate();
    await addVotes(debate, ["for", "for", "against", ...Array(8).fill("neutral")]);

    await closeDebate(debate._id);

    const closedDebate = await Debate.findById(debate._id).lean();
    expect(closedDebate.result).toBe("for");
    expect(closedDebate.voteCounts).toEqual({ for: 2, against: 1, neutral: 8 });
  });

  test("records losers when the winning side has no arguers", async () => {
    const debate = await createDebate();
    const loser = await createUser();
    await addArgument(debate, loser, "against");
    await addVotes(debate, ["for", "for", "against"]);

    const result = await closeDebate(debate._id);

    expect(result).toMatchObject({ result: "for", arguers: 1, bestArgument: null });
    expect((await stats(loser)).stats.losses).toBe(1);
  });

  test("closes a debate without arguers and changes no user stats", async () => {
    const debate = await createDebate();
    await addVotes(debate, ["for"]);

    const result = await closeDebate(debate._id);

    expect(result).toMatchObject({ closed: true, result: "for", arguers: 0 });
    expect((await Debate.findById(debate._id).lean()).status).toBe("closed");
  });

  test("counts a user with several arguments only once", async () => {
    const debate = await createDebate();
    const arguer = await createUser();
    await addArgument(debate, arguer, "for");
    await addArgument(debate, arguer, "for");
    await addVotes(debate, ["for"]);

    const result = await closeDebate(debate._id);

    expect(result.arguers).toBe(1);
    expect((await stats(arguer)).stats).toMatchObject({
      debates: 1,
      wins: 1,
    });
  });

  test("selects the highest-upvoted winning argument and breaks ties by age", async () => {
    const debate = await createDebate();
    const winner = await createUser();
    const tieWinner = await createUser();
    const tieLater = await createUser();
    const zero = await createUser();
    const lower = await createUser();
    const loser = await createUser();
    const earliest = new Date("2020-01-01T00:00:00.000Z");
    const tieArgument = await addArgument(debate, tieWinner, "for", {
      upvoteCount: 5,
      createdAt: earliest,
    });
    await addArgument(debate, tieLater, "for", {
      upvoteCount: 5,
      createdAt: new Date(earliest.getTime() + 1000),
    });
    await addArgument(debate, winner, "for", {
      upvoteCount: 5,
    });
    await addArgument(debate, zero, "for", { upvoteCount: 0 });
    await addArgument(debate, lower, "for", { upvoteCount: 3 });
    await addArgument(debate, loser, "against", { upvoteCount: 99 });
    await addVotes(debate, ["for", "for", "against"]);

    const result = await closeDebate(debate._id);

    expect(String(result.bestArgument)).toBe(String(tieArgument._id));
    expect((await stats(winner)).badges.bestArguments).toBe(0);
    expect((await stats(tieWinner)).badges.bestArguments).toBe(1);
    expect((await stats(tieLater)).badges.bestArguments).toBe(0);
    expect((await stats(zero)).badges.bestArguments).toBe(0);
    expect((await stats(lower)).badges.bestArguments).toBe(0);
    expect((await stats(loser)).badges.bestArguments).toBe(0);
    expect(String((await Debate.findById(debate._id).lean()).bestArgument)).toBe(
      String(tieArgument._id)
    );
  });

  test("corrects stored vote counts from the Vote collection", async () => {
    const debate = await createDebate();
    await Debate.updateOne(
      { _id: debate._id },
      { $set: { voteCounts: { for: 20, against: 10, neutral: 7 } } }
    );
    await addVotes(debate, ["against", "against", "neutral"]);

    await closeDebate(debate._id);

    const closedDebate = await Debate.findById(debate._id).lean();
    expect(closedDebate.voteCounts).toEqual({ for: 0, against: 2, neutral: 1 });
    expect(closedDebate.result).toBe("against");
  });

  test("applies stats only once when called twice", async () => {
    const debate = await createDebate();
    const arguer = await createUser();
    await addArgument(debate, arguer, "for");
    await addVotes(debate, ["for"]);

    const first = await closeDebate(debate._id);
    const second = await closeDebate(debate._id);

    expect(first.closed).toBe(true);
    expect(second).toEqual({ skipped: true });
    expect((await stats(arguer)).stats.debates).toBe(1);
  });

  test("applies stats only once when called concurrently", async () => {
    const debate = await createDebate();
    const arguer = await createUser();
    await addArgument(debate, arguer, "for");
    await addVotes(debate, ["for"]);

    const results = await Promise.all([
      closeDebate(debate._id),
      closeDebate(debate._id),
    ]);

    expect(results.filter((result) => result.closed)).toHaveLength(1);
    expect(results.filter((result) => result.skipped)).toHaveLength(1);
    expect((await stats(arguer)).stats.debates).toBe(1);
  });

  test("skips an open debate that is not due", async () => {
    const debate = await createDebate({ due: false });
    const result = await closeDebate(debate._id);

    expect(result).toEqual({ skipped: true });
    expect((await Debate.findById(debate._id).lean()).status).toBe("open");
  });

  test("rejects voting and argument posting after closing", async () => {
    const debate = await createDebate({ due: false });
    const user = await createUser();
    await Debate.updateOne(
      { _id: debate._id },
      { $set: { status: "closed", statsProcessed: true } }
    );

    await expect(castVote(user._id, debate._id, "for")).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(
      createArgument(user._id, debate._id, {
        side: "for",
        text: "This argument is long enough for validation.",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("populates closed debate result details and best argument author", async () => {
    const debate = await createDebate();
    const author = await createUser();
    await addArgument(debate, author, "for", { upvoteCount: 1 });
    await addVotes(debate, ["for"]);
    await closeDebate(debate._id);

    const result = await getDebateById(debate._id);

    expect(result.result).toBe("for");
    expect(result.voteCounts).toEqual({ for: 1, against: 0, neutral: 0 });
    expect(result.bestArgument).toMatchObject({
      text: expect.any(String),
      side: "for",
      upvoteCount: 1,
      author: { username: author.username, avatar: "" },
    });
  });
});
