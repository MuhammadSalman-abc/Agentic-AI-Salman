import type { Logger } from "@workspace/logging";
import type { ApiConfig } from "../types/index.js";
import { createMongoDbIntegration } from "../integrations/index.js";
import { createLlmProvider } from "../integrations/llm/provider.js";
import { createPlanningRepository, createPlanningService } from "../features/planning/index.js";
import { createApp } from "./create-app.js";

export const createApiRuntime = ({ config, logger, serverless = false, onBackgroundTask }: Readonly<{
  config: ApiConfig; logger: Logger; serverless?: boolean; onBackgroundTask?: (task: Promise<void>) => void;
}>) => {
  const database = createMongoDbIntegration({ logger, ...(config.mongodbUri ? { uri: config.mongodbUri } : {}) });
  const planning = createPlanningService({
    repository: createPlanningRepository(), logger, persistenceAvailable: Boolean(config.mongodbUri),
    ...(config.llm ? { provider: createLlmProvider(config.llm), configuration: config.llm } : {}),
    // A waiting in-memory job cannot safely outlive a Vercel invocation.
    ...(serverless ? { queueLimits: { concurrency: config.generationQueue?.concurrency ?? 1, maxQueued: 0 } }
      : config.generationQueue ? { queueLimits: config.generationQueue } : {}),
    ...(onBackgroundTask ? { onBackgroundTask } : {})
  });
  return { app: createApp({ config, logger, planning }), database, planning };
};
