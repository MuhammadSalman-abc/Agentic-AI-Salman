import {
  validateApiEnvironment
} from "../validation/env.validation.js";
import type { ApiEnvironmentSource, ValidatedApiEnvironment } from "../types/index.js";

export const readApiEnvironment = (
  source: ApiEnvironmentSource = process.env
): ValidatedApiEnvironment => validateApiEnvironment({
  NODE_ENV: source.NODE_ENV,
  API_HOST: source.API_HOST,
  API_PORT: source.API_PORT,
  WEB_ORIGIN: source.WEB_ORIGIN,
  MONGODB_URI: source.MONGODB_URI,
  LOG_LEVEL: source.LOG_LEVEL
});
