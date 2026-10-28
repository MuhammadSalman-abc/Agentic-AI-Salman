import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import type { Logger } from "@workspace/logging";
import { createApp } from "../bootstrap/create-app.js";
import { createServer } from "../bootstrap/create-server.js";

void test("API limiter returns stable 429 and Retry-After, resets, and keeps health/preflight available", async () => {
  const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
  const config = { environment: "test" as const, host: "127.0.0.1", port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" as const,
    rateLimits: { windowMs: 500, requests: 3, generations: 1 } };
  const api = createServer({ app: createApp({ config, logger }), config, logger });
  await api.start();
  try {
    const address = api.raw.address(); assert.ok(address && typeof address === "object");
    const base = `http://127.0.0.1:${String(address.port)}`;
    const post = async () => fetch(`${base}/api/projects/test/generation-runs`, { method: "POST" });
    const first = await post(); assert.equal(first.status, 404); await first.arrayBuffer();
    const limited = await post(); assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    const body = await limited.json() as { error: { code: string; requestId: string } };
    assert.equal(body.error.code, "api_rate_limit_exceeded"); assert.ok(body.error.requestId);
    for (let index = 0; index < 3; index++) {
      const response = await fetch(`${base}/api/missing`); await response.arrayBuffer();
      if (index === 2) assert.equal(response.status, 429);
    }
    const health = await fetch(`${base}/health`); assert.equal(health.status, 200); await health.arrayBuffer();
    const preflight = await fetch(`${base}/api/projects`, { method: "OPTIONS" }); assert.equal(preflight.status, 204);
    await delay(550);
    const reset = await post(); assert.equal(reset.status, 404); await reset.arrayBuffer();
  } finally { await api.stop(); }
});
