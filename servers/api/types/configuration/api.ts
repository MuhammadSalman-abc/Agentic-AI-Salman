import type { LogLevel } from "@workspace/logging";
import type { ApiEnvironment } from "@workspace/types";

export type ApiConfig = Readonly<{
  environment: ApiEnvironment;
  host: string;
  port: number;
  webOrigin: string;
  mongodbUri?: string;
  llm?: Readonly<{
    provider: "groq" | "gemini";
    model: string;
    apiKey: string;
    timeoutMs: number;
  }>;
  logLevel: LogLevel;
  generationQueue?: Readonly<{ concurrency: number; maxQueued: number }>;
  rateLimits?: Readonly<{ windowMs: number; requests: number; generations: number }>;
}>;
