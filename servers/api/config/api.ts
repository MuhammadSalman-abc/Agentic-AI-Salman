import type { ApiConfig, ValidatedApiEnvironment } from "../types/index.js";

export const createApiConfig = (environment: ValidatedApiEnvironment): ApiConfig => {
  const provider = environment.LLM_PROVIDER;
  const apiKey = provider === "groq" ? environment.GROQ_API_KEY
    : provider === "gemini" ? environment.GEMINI_API_KEY : undefined;
  const llm = provider && environment.LLM_MODEL && apiKey ? {
    provider, model: environment.LLM_MODEL, apiKey,
    timeoutMs: environment.LLM_TIMEOUT_MS ?? 90_000
  } : undefined;
  return Object.freeze({
    environment: environment.NODE_ENV,
    host: environment.API_HOST,
    port: environment.API_PORT,
    webOrigin: environment.WEB_ORIGIN,
    logLevel: environment.LOG_LEVEL,
    ...(llm ? { llm } : {}),
    ...(environment.MONGODB_URI ? { mongodbUri: environment.MONGODB_URI } : {})
  });
};
