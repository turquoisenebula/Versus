const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const { startCloseDebatesJob } = require("./jobs/closeDebates.job");

async function startServer() {
  await connectDB();
  startCloseDebatesJob();

  return app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
  });
}

module.exports = startServer;
