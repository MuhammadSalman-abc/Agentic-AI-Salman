import test from "node:test";
import assert from "node:assert/strict";
import { createLlmProvider, LlmProviderError } from "../integrations/llm/provider.js";

const request = {
  stage: "planning",
  systemInstructions: "Return a structured plan.",
  input: { requirement: "Example requirement" },
  timeoutMs: 1000
};

const parseRequestBody = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "string") throw new TypeError("Expected the LLM request body to be JSON text.");
  return JSON.parse(body) as Record<string, unknown>;
};

void test("Groq adapter sends structured-output request and parses JSON", async (context) => {
  let capturedUrl = "";
  let capturedHeaders: Headers | undefined;
  let capturedBody: Record<string, unknown> | undefined;
  const mockFetch: typeof globalThis.fetch = (input, init) => {
    capturedUrl = input instanceof Request ? input.url : input.toString();
    capturedHeaders = new Headers(init?.headers);
    capturedBody = parseRequestBody(init?.body);
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ features: ["F1"] }) } }]
    }), { status: 200 }));
  };
  context.mock.method(globalThis, "fetch", mockFetch);

  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });
  const result = await provider.generateJson(request);

  assert.equal(capturedUrl, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(capturedHeaders?.get("authorization"), "Bearer test-secret");
  assert.deepEqual(capturedBody?.response_format, { type: "json_object" });
  assert.deepEqual(result, { features: ["F1"] });
});

void test("Gemini adapter sends server key and parses candidate JSON", async (context) => {
  let capturedUrl = "";
  let capturedHeaders: Headers | undefined;
  let capturedBody: Record<string, unknown> | undefined;
  const mockFetch: typeof globalThis.fetch = (input, init) => {
    capturedUrl = input instanceof Request ? input.url : input.toString();
    capturedHeaders = new Headers(init?.headers);
    capturedBody = parseRequestBody(init?.body);
    return Promise.resolve(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ stories: ["S1"] }) }] } }]
    }), { status: 200 }));
  };
  context.mock.method(globalThis, "fetch", mockFetch);

  const provider = createLlmProvider({ provider: "gemini", model: "gemini-test", apiKey: "test-secret", timeoutMs: 1000 });
  const result = await provider.generateJson(request);

  assert.match(capturedUrl, /models\/gemini-test:generateContent$/);
  assert.equal(capturedHeaders?.get("x-goog-api-key"), "test-secret");
  assert.deepEqual(capturedBody?.generationConfig, { responseMimeType: "application/json", temperature: 0.2 });
  assert.deepEqual(result, { stories: ["S1"] });
});

void test("provider HTTP errors classify auth and rate limits as terminal", async (context) => {
  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });
  let status = 401;
  let providerCode = "invalid_api_key";
  context.mock.method(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify({ error: { code: providerCode } }), { status })));

  await assert.rejects(provider.generateJson(request), (error: unknown) => {
    assert.ok(error instanceof LlmProviderError);
    assert.equal(error.retryable, false);
    assert.doesNotMatch(error.message, /test-secret|invalid_api_key/);
    return true;
  });

  status = 429;
  providerCode = "rate_limit_exceeded";
  await assert.rejects(provider.generateJson(request), (error: unknown) => {
    assert.ok(error instanceof LlmProviderError);
    assert.equal(error.retryable, false);
    assert.doesNotMatch(error.message, /test-secret|rate_limit_exceeded/);
    return true;
  });
});

void test("malformed provider JSON becomes a retryable normalized error", async (context) => {
  context.mock.method(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: "not valid JSON" } }]
  }), { status: 200 })));
  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });

  await assert.rejects(provider.generateJson(request), (error: unknown) => {
    assert.ok(error instanceof LlmProviderError);
    assert.equal(error.code, "invalid_json_response");
    assert.equal(error.retryable, true);
    assert.doesNotMatch(error.message, /not valid JSON|test-secret/);
    return true;
  });
});

void test("provider timeout is normalized as retryable", async (context) => {
  context.mock.method(globalThis, "fetch", () => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" })));
  const provider = createLlmProvider({ provider: "gemini", model: "gemini-test", apiKey: "test-secret", timeoutMs: 1 });

  await assert.rejects(provider.generateJson(request), (error: unknown) => {
    assert.ok(error instanceof LlmProviderError);
    assert.equal(error.code, "provider_timeout");
    assert.equal(error.retryable, true);
    assert.doesNotMatch(error.message, /test-secret/);
    return true;
  });
});
