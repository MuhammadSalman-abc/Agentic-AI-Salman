import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

export type ApiRateLimits = Readonly<{ windowMs: number; requests: number; generations: number }>;
export const createApiRateLimiters = (limits?: ApiRateLimits): readonly RequestHandler[] => {
  const makeLimiter = (limit: number, generationOnly: boolean): RequestHandler => rateLimit({
    windowMs: limits?.windowMs ?? 60_000, limit, standardHeaders: "draft-8", legacyHeaders: false,
    skip: (request) => request.method === "OPTIONS" || !request.path.startsWith("/api/") ||
      (generationOnly && !(request.method === "POST" && /^\/api\/projects\/[^/]+\/generation-runs\/?$/.test(request.path))),
    handler: (_request, response) => {
      response.status(429).json({ error: { code: "api_rate_limit_exceeded", message: "Too many requests. Wait for Retry-After before trying again.", requestId: response.getHeader("X-Request-Id") } });
    }
  });
  return [makeLimiter(limits?.requests ?? 600, false), makeLimiter(limits?.generations ?? 10, true)];
};
