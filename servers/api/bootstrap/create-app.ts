import express, { type Express } from "express";
import { createHttpLogger, type Logger } from "@workspace/logging";
import type { ApiConfig } from "../types/index.js";
import { apiRuntime } from "../constants/index.js";
import { createHealthRoutes } from "../features/health/index.js";
import { createPlanningRoutes } from "../features/planning/index.js";
import type { PlanningHttpService } from "../features/planning/index.js";
import { createCorsMiddleware, createErrorHandler, createNotFoundHandler, createRequestIdMiddleware, createApiRateLimiters } from "../middleware/index.js";

type AppDependencies = Readonly<{ config: ApiConfig; logger: Logger; planning?: PlanningHttpService }>;

export const createApp = ({ config, logger, planning }: AppDependencies): Express => {
  const app = express();
  app.disable("x-powered-by");
  app.use(createRequestIdMiddleware());
  app.use(createHttpLogger({
    logger,
    format: config.environment === "production" ? "combined" : "dev"
  }));
  app.use(createCorsMiddleware({ origin: config.webOrigin }));
  for (const limiter of createApiRateLimiters(config.rateLimits)) app.use(limiter);
  app.use(express.json({ limit: apiRuntime.jsonBodyLimit }));
  const featureRouters = [createHealthRoutes({
    environment: config.environment,
    serviceName: apiRuntime.serviceName
  }), ...(planning ? [createPlanningRoutes(planning)] : [])];
  for (const featureRouter of featureRouters) app.use(featureRouter);
  app.use(createNotFoundHandler());
  app.use(createErrorHandler({ logger }));
  return app;
};
