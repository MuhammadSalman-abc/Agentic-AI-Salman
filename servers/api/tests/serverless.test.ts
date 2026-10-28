import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import type { Logger } from "@workspace/logging";
import { createApp, createServer, createServerlessApp } from "../bootstrap/index.js";

void test("serverless bootstrap retries failed initialization and shares initialization across requests", async () => {
  const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
  const config = { environment: "test" as const, host: "127.0.0.1", port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" as const };
  let attempts = 0;
  const app = createServerlessApp(async () => {
    attempts++;
    await delay(25);
    if (attempts === 1) throw new Error("private database credentials must not leak");
    return createApp({ config, logger });
  });
  assert.equal(attempts, 0, "Import/bootstrap must not connect to MongoDB at build time");
  const server = createServer({ app, config, logger });
  await server.start();
  try {
    const address = server.raw.address(); assert.ok(address && typeof address === "object");
    const url = `http://127.0.0.1:${String(address.port)}/health`;
    const failed = await fetch(url);
    assert.equal(failed.status, 503);
    assert.doesNotMatch(await failed.text(), /private database/);
    const responses = await Promise.all(Array.from({ length: 5 }, () => fetch(url)));
    for (const response of responses) { assert.equal(response.status, 200); await response.arrayBuffer(); }
    assert.equal(attempts, 2);
  } finally { await server.stop(); }
});
