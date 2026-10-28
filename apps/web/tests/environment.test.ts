import test from "node:test";
import assert from "node:assert/strict";
import { createApiConfiguration } from "../config/api";
import { readWebEnvironment } from "../config/env";
import { GET as getHealth } from "../app/health/route";

test("derives API configuration from validated environment input", () => {
  const environment = readWebEnvironment({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.test" });
  assert.deepEqual(createApiConfiguration(environment), { baseUrl: "https://api.example.test" });
});

test("rejects an invalid API URL", () => {
  assert.throws(() => readWebEnvironment({ NEXT_PUBLIC_API_BASE_URL: "not-a-url" }));
});

test("uses same-origin API paths without a public URL, including during prerender", () => {
  assert.deepEqual(createApiConfiguration(readWebEnvironment({})), { baseUrl: "" });
  assert.deepEqual(createApiConfiguration(readWebEnvironment({ NEXT_PUBLIC_API_BASE_URL: "" })), { baseUrl: "" });
});

test("health uses the runtime binding without exposing its URL to the browser", async () => {
  const originalFetch = globalThis.fetch;
  const originalBinding = process.env.API_SERVICE_URL;
  process.env.API_SERVICE_URL = "http://private-binding.test/internal/";
  globalThis.fetch = (async (input) => {
    assert.equal(String(input), "http://private-binding.test/internal/health");
    return new Response('{"status":"ok"}', { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const response = await getHealth();
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '{"status":"ok"}');
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBinding === undefined) delete process.env.API_SERVICE_URL; else process.env.API_SERVICE_URL = originalBinding;
  }
});

test("health failures omit internal binding details", async () => {
  const originalFetch = globalThis.fetch;
  const originalBinding = process.env.API_SERVICE_URL;
  process.env.API_SERVICE_URL = "http://private-binding.test/";
  globalThis.fetch = (() => Promise.reject(new Error("private-binding.test failed"))) as typeof fetch;
  try {
    const response = await getHealth();
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /private-binding/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBinding === undefined) delete process.env.API_SERVICE_URL; else process.env.API_SERVICE_URL = originalBinding;
  }
});
