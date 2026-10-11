const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const debateRoutes = require("./routes/debate.routes");
const upvoteRoutes = require("./routes/upvote.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/arguments", upvoteRoutes);
app.use("/api/debates", debateRoutes);

app.use(errorHandler);

module.exports = app;
