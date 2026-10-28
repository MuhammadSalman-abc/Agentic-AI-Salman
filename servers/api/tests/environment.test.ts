import test from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { createApiConfig, readApiEnvironment } from "../config/index.js";

void test("derives API configuration from validated environment input", () => {
  const environment = readApiEnvironment({
    NODE_ENV: "production",
    API_HOST: "0.0.0.0",
    API_PORT: "8080",
    WEB_ORIGIN: "https://example.test",
    LOG_LEVEL: "warn"
  });
  assert.deepEqual(createApiConfig(environment), {
    environment: "production",
    host: "0.0.0.0",
    port: 8080,
    webOrigin: "https://example.test",
    logLevel: "warn",
    generationQueue: { concurrency: 1, maxQueued: 20 },
    rateLimits: { windowMs: 60_000, requests: 600, generations: 10 }
  });
});

void test("rejects invalid server environment input", () => {
  assert.throws(() => readApiEnvironment({ API_PORT: "70000" }));
});

void test("requires runtime values from the environment", () => {
  assert.throws(() => readApiEnvironment({}), ZodError);
});

void test("queue and rate thresholds are validated and configurable without provider credentials", () => {
  const source = { NODE_ENV: "test", API_HOST: "127.0.0.1", API_PORT: "4000", WEB_ORIGIN: "http://localhost:3000", LOG_LEVEL: "silent" };
  const config = createApiConfig(readApiEnvironment({ ...source, GENERATION_CONCURRENCY: "2", GENERATION_MAX_QUEUED: "5", API_RATE_LIMIT_PER_MINUTE: "300", GENERATION_RATE_LIMIT_PER_MINUTE: "4" }));
  assert.deepEqual(config.generationQueue, { concurrency: 2, maxQueued: 5 });
  assert.deepEqual(config.rateLimits, { windowMs: 60_000, requests: 300, generations: 4 });
  for (const invalid of [{ GENERATION_CONCURRENCY: "0" }, { GENERATION_MAX_QUEUED: "-1" }, { API_RATE_LIMIT_PER_MINUTE: "0" }, { GENERATION_RATE_LIMIT_PER_MINUTE: "nope" }]) {
    assert.throws(() => readApiEnvironment({ ...source, ...invalid }), ZodError);
  }
});
