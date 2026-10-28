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
  LLM_PROVIDER: source.LLM_PROVIDER,
  LLM_MODEL: source.LLM_MODEL,
  GROQ_API_KEY: source.GROQ_API_KEY,
  GEMINI_API_KEY: source.GEMINI_API_KEY,
  LLM_TIMEOUT_MS: source.LLM_TIMEOUT_MS,
  LOG_LEVEL: source.LOG_LEVEL,
  GENERATION_CONCURRENCY: source.GENERATION_CONCURRENCY,
  GENERATION_MAX_QUEUED: source.GENERATION_MAX_QUEUED,
  API_RATE_LIMIT_PER_MINUTE: source.API_RATE_LIMIT_PER_MINUTE,
  GENERATION_RATE_LIMIT_PER_MINUTE: source.GENERATION_RATE_LIMIT_PER_MINUTE
});
