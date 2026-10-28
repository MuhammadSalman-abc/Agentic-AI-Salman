import { z } from "zod";
import type { ValidatedApiEnvironment } from "../types/index.js";

export const apiEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  API_HOST: z.string().min(1),
  API_PORT: z.coerce.number().int().min(1).max(65_535),
  WEB_ORIGIN: z.url(),
  MONGODB_URI: z.string().min(1).optional(),
  LLM_PROVIDER: z.enum(["groq", "gemini"]).optional(),
  LLM_MODEL: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(180_000).optional(),
  GENERATION_CONCURRENCY: z.coerce.number().int().min(1).max(8).optional(),
  GENERATION_MAX_QUEUED: z.coerce.number().int().min(0).max(100).optional(),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100_000).optional(),
  GENERATION_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1_000).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
}).superRefine((environment, context) => {
  if (!environment.LLM_PROVIDER) return;
  if (!environment.LLM_MODEL) {
    context.addIssue({ code: "custom", path: ["LLM_MODEL"], message: "LLM_MODEL is required when LLM_PROVIDER is configured." });
  }
  const apiKey = environment.LLM_PROVIDER === "groq" ? environment.GROQ_API_KEY : environment.GEMINI_API_KEY;
  if (!apiKey) {
    const keyName = environment.LLM_PROVIDER === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY";
    context.addIssue({ code: "custom", path: [keyName], message: `${keyName} is required for the selected LLM provider.` });
  }
}) satisfies z.ZodType<ValidatedApiEnvironment>;

export const validateApiEnvironment = (input: unknown): ValidatedApiEnvironment =>
  Object.freeze(apiEnvironmentSchema.parse(input));
