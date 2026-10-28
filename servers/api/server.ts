import "dotenv/config";
import { createLogger } from "@workspace/logging";
import { createApiRuntime, createServer, createShutdown } from "./bootstrap/index.js";
import { createApiConfig, readApiEnvironment } from "./config/index.js";
import { apiRuntime } from "./constants/index.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
const config = createApiConfig(readApiEnvironment());
const logger = createLogger({
  service: apiRuntime.serviceName,
  level: config.logLevel,
  format: config.environment === "production" ? "json" : "pretty"
});
const { app, database, planning } = createApiRuntime({ config, logger });
const server = createServer({ app, config, logger });

const shutdown = createShutdown({ database, logger, server, stopGeneration: planning.stopGeneration });

await database.connect();
if (config.mongodbUri) await planning.resumeQueuedRuns();
await server.start();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error("API shutdown failed.", { error: error instanceof Error ? error.message : String(error) });
        process.exit(1);
      });
  });
}
