import { waitUntil } from "@vercel/functions";
import { createLogger } from "@workspace/logging";
import { createApiRuntime, createServerlessApp } from "./bootstrap/index.js";
import { createApiConfig, readApiEnvironment } from "./config/index.js";
import { apiRuntime } from "./constants/index.js";

export default createServerlessApp(async () => {
  const config = createApiConfig(readApiEnvironment());
  const logger = createLogger({ service: apiRuntime.serviceName, level: config.logLevel, format: "json" });
  const runtime = createApiRuntime({ config, logger, serverless: true, onBackgroundTask: waitUntil });
  await runtime.database.connect();
  // Never run single-worker restart recovery on a Vercel cold start: another instance
  // might still be processing the active run. Durable distributed recovery needs leases.
  return runtime.app;
});
