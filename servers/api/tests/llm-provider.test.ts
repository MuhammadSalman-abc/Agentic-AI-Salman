import test from "node:test";
import assert from "node:assert/strict";
import { createLlmProvider, LlmProviderError } from "../integrations/llm/provider.js";
import type { PlanningTokenUsage } from "@workspace/types";

const request = {
  stage: "planning",
  systemInstructions: "Return a structured plan.",
  input: { requirement: "Example requirement" },
  timeoutMs: 1000,
  maxCompletionTokens: 8_192
};

const parseRequestBody = (body: unknown): Record<string, unknown> => {
  if (typeof body !== "string") throw new TypeError("Expected the LLM request body to be JSON text.");
  return JSON.parse(body) as Record<string, unknown>;
};

void test("Groq adapter requests JSON mode, applies the output token budget, and parses JSON", async (context) => {
  let capturedUrl = "";
  let capturedHeaders: Headers | undefined;
  let capturedBody: Record<string, unknown> | undefined;
  const mockFetch: typeof globalThis.fetch = (input, init) => {
    capturedUrl = input instanceof Request ? input.url : input.toString();
    capturedHeaders = new Headers(init?.headers);
    capturedBody = parseRequestBody(init?.body);
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ features: ["F1"] }) } }],
      usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 }
    }), { status: 200 }));
  };
  context.mock.method(globalThis, "fetch", mockFetch);

  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });
  let usage: PlanningTokenUsage | undefined;
  const result = await provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } });

  assert.equal(capturedUrl, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(capturedHeaders?.get("authorization"), "Bearer test-secret");
  assert.deepEqual(capturedBody?.response_format, { type: "json_object" });
  assert.equal(capturedBody.max_completion_tokens, 8_192);
  assert.deepEqual(result, { features: ["F1"] });
  assert.deepEqual(usage, { inputTokens: 120, outputTokens: 80, totalTokens: 200 });
});

void test("Groq adapter extracts JSON from a fenced response without another provider call", async (context) => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", () => {
    calls += 1;
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: "Here is the plan:\n```json\n{\"tasks\": []}\n```" } }]
    }), { status: 200 }));
  });
  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });

  const result = await provider.generateJson(request);

  assert.deepEqual(result, { tasks: [] });
  assert.equal(calls, 1);
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
      candidates: [{ content: { parts: [{ text: JSON.stringify({ stories: ["S1"] }) }] } }],
      usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 20, totalTokenCount: 75 }
    }), { status: 200 }));
  };
  context.mock.method(globalThis, "fetch", mockFetch);

  const provider = createLlmProvider({ provider: "gemini", model: "gemini-test", apiKey: "test-secret", timeoutMs: 1000 });
  let usage: PlanningTokenUsage | undefined;
  const result = await provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } });

  assert.match(capturedUrl, /models\/gemini-test:generateContent$/);
  assert.equal(capturedHeaders?.get("x-goog-api-key"), "test-secret");
  assert.deepEqual(capturedBody?.generationConfig, { responseMimeType: "application/json", temperature: 0.2 });
  assert.deepEqual(result, { stories: ["S1"] });
  assert.deepEqual(usage, { inputTokens: 40, outputTokens: 20, totalTokens: 75 });
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

void test("missing or invalid usage remains unknown instead of becoming zero", async (context) => {
  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });
  let usage: PlanningTokenUsage | undefined;
  let metadata: unknown;
  context.mock.method(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: "{}" } }], usage: metadata
  }), { status: 200 })));
  await provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } });
  assert.equal(usage, undefined);
  metadata = { prompt_tokens: -1, completion_tokens: "10", total_tokens: 1.5 };
  await provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } });
  assert.equal(usage, undefined);
  metadata = { prompt_tokens: 0, completion_tokens: 12 };
  await provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } });
  assert.deepEqual(usage, { inputTokens: 0, outputTokens: 12, totalTokens: null });
});

void test("provider usage is reported even when completion JSON is malformed", async (context) => {
  context.mock.method(globalThis, "fetch", () => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: "malformed" } }], usage: { prompt_tokens: 5, completion_tokens: 8, total_tokens: 13 }
  }), { status: 200 })));
  const provider = createLlmProvider({ provider: "groq", model: "test-model", apiKey: "test-secret", timeoutMs: 1000 });
  let usage: PlanningTokenUsage | undefined;
  await assert.rejects(provider.generateJson({ ...request, onUsage: (reported) => { usage = reported; } }), /malformed JSON/);
  assert.deepEqual(usage, { inputTokens: 5, outputTokens: 8, totalTokens: 13 });
});
