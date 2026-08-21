import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { logEmailProviderStatus } from "./services/email/index.js";

const env = loadEnv();
const app = createApp();
logEmailProviderStatus(env);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "LastMile API started");
});

async function shutdown() {
  logger.info("Shutting down");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
