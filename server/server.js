const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");

async function startServer() {
  await connectDB();

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
