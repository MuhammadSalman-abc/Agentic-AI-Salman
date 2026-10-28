import type { LogLevel } from "@workspace/logging";
import type { ApiEnvironment } from "@workspace/types";

export type ApiEnvironmentSource = Readonly<Record<string, string | undefined>>;

export type ValidatedApiEnvironment = Readonly<{
  NODE_ENV: ApiEnvironment;
  API_HOST: string;
  API_PORT: number;
  WEB_ORIGIN: string;
  MONGODB_URI?: string | undefined;
  LLM_PROVIDER?: "groq" | "gemini" | undefined;
  LLM_MODEL?: string | undefined;
  GROQ_API_KEY?: string | undefined;
  GEMINI_API_KEY?: string | undefined;
  LLM_TIMEOUT_MS?: number | undefined;
  LOG_LEVEL: LogLevel;
  GENERATION_CONCURRENCY?: number | undefined;
  GENERATION_MAX_QUEUED?: number | undefined;
  API_RATE_LIMIT_PER_MINUTE?: number | undefined;
  GENERATION_RATE_LIMIT_PER_MINUTE?: number | undefined;
}>;
