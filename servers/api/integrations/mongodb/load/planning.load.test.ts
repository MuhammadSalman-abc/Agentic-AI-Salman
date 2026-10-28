import "dotenv/config";
import assert from "node:assert/strict";
import dns from "node:dns";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import mongoose from "mongoose";
import type { Logger } from "@workspace/logging";
import type { ArchitecturePlan, PlanningRun } from "@workspace/types";
import { createApp } from "../../../bootstrap/create-app.js";
import { createServer } from "../../../bootstrap/create-server.js";
import { createPlanningRepository, createPlanningService } from "../../../features/planning/index.js";
import { LlmProviderError, type LlmProvider } from "../../llm/provider.js";
import { ArchitectureVersionModel, GenerationRunModel, ProjectModel } from "../planning.models.js";
import { createPlanningFixtureProvider } from "../tests/planning.fixture.js";

type Sample = Readonly<{ status: number; ms: number }>;
type Measurement = Readonly<{ name: string; concurrency: number; requests: number; durationMs: number; requestsPerSecond: number; p50Ms: number; p95Ms: number; p99Ms: number; statuses: Record<string, number>; rssMiB: number }>;
const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
const requirement = "Persist a generated plan and allow the saved version to be retrieved.";
const round = (value: number): number => Math.round(value * 100) / 100;

const measure = async (name: string, concurrency: number, requests: number, action: (index: number) => Promise<number>): Promise<Measurement> => {
  const samples: Sample[] = [];
  let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < requests) {
      const index = next++;
      const before = performance.now();
      const status = await action(index);
      samples.push({ status, ms: performance.now() - before });
    }
  }));
  const durationMs = performance.now() - started;
  const sorted = samples.map(({ ms }) => ms).sort((a, b) => a - b);
  const percentile = (fraction: number): number => round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0);
  const statuses: Record<string, number> = {};
  for (const { status } of samples) statuses[String(status)] = (statuses[String(status)] ?? 0) + 1;
  return { name, concurrency, requests, durationMs: round(durationMs), requestsPerSecond: round(requests * 1_000 / durationMs), p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99), statuses, rssMiB: round(process.memoryUsage().rss / 1_048_576) };
};

void test("bounded HTTP load, concurrency, provider rate-limit and recovery checks", { timeout: 180_000 }, async (context) => {
  const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
  assert.ok(uri, "Set MONGODB_TEST_URI (preferred) or MONGODB_URI; load testing must not silently skip.");
  const databaseName = `load_${String(process.pid)}_${String(Date.now())}`;
  const measurements: Measurement[] = [];
  const fixture = createPlanningFixtureProvider();
  let calls = 0;
  let activeCalls = 0;
  let peakActiveCalls = 0;
  let rejectWith429 = false;
  let providerGate: Promise<void> | null = null;
  let completed = false;
  const provider: LlmProvider = { name: "groq", model: "load-fake", generateJson: async (request) => {
    calls++;
    activeCalls++;
    peakActiveCalls = Math.max(peakActiveCalls, activeCalls);
    try {
      await delay(150);
      if (providerGate) await providerGate;
      if (rejectWith429) throw new LlmProviderError("rate_limit_exceeded", "LLM provider returned HTTP 429.", false);
      return await fixture.generateJson(request);
    } finally { activeCalls--; }
  } };
  const planning = createPlanningService({ repository: createPlanningRepository(), provider, configuration: { provider: "groq", model: "load-fake", apiKey: "test-only", timeoutMs: 2_000 }, persistenceAvailable: true, logger, queueLimits: { concurrency: 2, maxQueued: 30 } });
  // Capacity tests deliberately raise HTTP thresholds; the separate rate-limit test proves 429 behavior.
  const config = { environment: "test" as const, host: "127.0.0.1", port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" as const, rateLimits: { windowMs: 60_000, requests: 100_000, generations: 1_000 } };
  const api = createServer({ app: createApp({ config, logger, planning }), config, logger });
  let baseUrl = "";
  const request = async (path: string, method = "GET", body?: unknown, key?: string): Promise<Response> => fetch(`${baseUrl}${path}`, {
    method, signal: AbortSignal.timeout(20_000), headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const createProject = async (name: string): Promise<string> => {
    const response = await request("/api/projects", "POST", { name, context: "Isolated load test" });
    assert.equal(response.status, 201);
    return ((await response.json()) as { project: { id: string } }).project.id;
  };
  const submit = async (projectId: string, key: string): Promise<PlanningRun> => {
    const response = await request(`/api/projects/${projectId}/generation-runs`, "POST", { requirement }, key);
    assert.equal(response.status, 202);
    return ((await response.json()) as { run: PlanningRun }).run;
  };
  const waitForRun = async (id: string): Promise<PlanningRun> => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const response = await request(`/api/generation-runs/${id}`);
      assert.equal(response.status, 200);
      const { run } = await response.json() as { run: PlanningRun };
      if (["succeeded", "failed", "cancelled"].includes(run.status)) return run;
      await delay(80);
    }
    throw new Error(`Run ${id} did not reach a terminal state within 30s`);
  };

  // The configured URI supplies credentials/topology only; all writes target this new database.
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  await mongoose.connect(uri, { dbName: databaseName, maxPoolSize: 30, serverSelectionTimeoutMS: 15_000 });
  const database = mongoose.connection.db;
  assert.ok(database);
  try {
    const topology = await database.admin().command({ hello: 1 });
    assert.ok(typeof topology.setName === "string" || topology.msg === "isdbgrid", "Replica set required");
    await Promise.all([ProjectModel.init(), GenerationRunModel.init(), ArchitectureVersionModel.init()]);
    await api.start();
    const address = api.raw.address();
    assert.ok(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
    const projectId = await createProject("Duplicate submission load");

    await context.test("20 simultaneous duplicate submissions call the provider once", async () => {
      const before = calls;
      const runs = await Promise.all(Array.from({ length: 20 }, () => submit(projectId, "same-request")));
      assert.equal(new Set(runs.map(({ id }) => id)).size, 1);
      assert.equal((await waitForRun(runs[0]?.id ?? "")).status, "succeeded");
      assert.equal(calls - before, 1);
      assert.equal(await GenerationRunModel.countDocuments(), 1);
      assert.equal(await ArchitectureVersionModel.countDocuments(), 1);
    });

    await context.test("10 competing edits commit one version and reject nine stale writes", async () => {
      const response = await request(`/api/projects/${projectId}/versions/1`);
      assert.equal(response.status, 200);
      const { version } = await response.json() as { version: { plan: ArchitecturePlan } };
      const measurement = await measure("competing-edits", 10, 10, async () => {
        const edit = await request(`/api/projects/${projectId}/versions`, "POST", { baseVersion: 1, plan: version.plan });
        await edit.arrayBuffer();
        return edit.status;
      });
      measurements.push(measurement);
      assert.equal(measurement.statuses["201"], 1);
      assert.equal(measurement.statuses["409"], 9);
      assert.equal(await ArchitectureVersionModel.countDocuments(), 2);
    });

    await context.test("provider 429 burst fails once per run, saves no partial plans, then recovers", async () => {
      const ids = await Promise.all(Array.from({ length: 6 }, (_, index) => createProject(`429 project ${String(index)}`)));
      const beforeCalls = calls;
      const beforeVersions = await ArchitectureVersionModel.countDocuments();
      rejectWith429 = true;
      const runs = await Promise.all(ids.map((id) => submit(id, "rate-limit")));
      const results = await Promise.all(runs.map(({ id }) => waitForRun(id)));
      rejectWith429 = false;
      for (const run of results) {
        assert.equal(run.status, "failed");
        assert.equal(run.error?.code, "rate_limit_exceeded");
        assert.equal(run.resultVersion, null);
      }
      await delay(200);
      assert.equal(calls - beforeCalls, 6, "No retry storm after 429");
      assert.equal(await ArchitectureVersionModel.countDocuments(), beforeVersions);
      assert.equal((await waitForRun((await submit(ids[0] ?? "", "recovery")).id)).status, "succeeded");
    });

    for (const concurrency of [4, 12, 24]) {
      await context.test(`${String(concurrency)} independent projects generate concurrently`, async () => {
        const ids = await Promise.all(Array.from({ length: concurrency }, (_, index) => createProject(`Generation ${String(concurrency)}-${String(index)}`)));
        const before = calls;
        const measurement = await measure("generation-journey", concurrency, concurrency, async (index) => {
          const run = await submit(ids[index] ?? "", "generation-load");
          const terminal = await waitForRun(run.id);
          assert.equal(terminal.status, "succeeded", terminal.error?.message);
          const version = await request(`/api/projects/${ids[index] ?? ""}/versions/1`);
          assert.equal(version.status, 200);
          await version.arrayBuffer();
          return 200;
        });
        measurements.push(measurement);
        assert.equal(calls - before, concurrency);
      });
    }

    for (const concurrency of [10, 50, 100]) {
      await context.test(`bounded read stress at ${String(concurrency)} concurrent clients`, async () => {
        const paths = ["/health", "/api/projects", `/api/projects/${projectId}/versions/1`, `/api/projects/${projectId}`];
        const measurement = await measure("mixed-http-reads", concurrency, 400, async (index) => {
          const response = await request(paths[index % paths.length] ?? "/health");
          await response.arrayBuffer();
          return response.status;
        });
        measurements.push(measurement);
        assert.deepEqual(measurement.statuses, { "200": 400 });
        const health = await request("/health");
        assert.equal(health.status, 200, "API recovers after each burst");
        await health.arrayBuffer();
      });
    }
    await context.test("eight different keys with one active requirement reuse one run and provider call", async () => {
      const id = await createProject("Same project competing generations");
      let release: () => void = () => undefined;
      providerGate = new Promise<void>((resolve) => { release = resolve; });
      let runs: PlanningRun[];
      const before = calls;
      try {
        runs = await Promise.all(Array.from({ length: 8 }, (_, index) => submit(id, `distinct-${String(index)}`)));
      } finally { release(); providerGate = null; }
      const terminal = await Promise.all(runs.map((run) => waitForRun(run.id)));
      assert.equal(new Set(runs.map((run) => run.id)).size, 1);
      assert.ok(terminal.every((run) => run.status === "succeeded"));
      assert.equal(calls - before, 1);
      const response = await request(`/api/projects/${id}/versions`);
      assert.equal(response.status, 200);
      const payload = await response.json() as { versions: unknown[] };
      assert.equal(payload.versions.length, 1);
    });
    assert.equal(activeCalls, 0);
    assert.ok(peakActiveCalls <= 2, `Provider concurrency exceeded cap: ${String(peakActiveCalls)}`);
    assert.equal(await GenerationRunModel.countDocuments({ status: { $nin: ["succeeded", "failed", "cancelled"] } }), 0);
    completed = true;
  } finally {
    // Keep the evidence even if an assertion fails. No URI, prompts, keys or model output in report.
    await mkdir(new URL("../../../../../.repo-cache/", import.meta.url), { recursive: true });
    await writeFile(new URL("../../../../../.repo-cache/planning-load-results.json", import.meta.url), JSON.stringify({
      recordedAt: new Date().toISOString(), completed, node: process.version, provider: "local fake, 150ms delay", mongoPoolSize: 30,
      limitations: "Single API process; closed-loop bounded bursts; not production capacity or multi-instance scalability. RSS is a checkpoint, not peak memory.",
      providerCalls: calls, peakActiveProviderCalls: peakActiveCalls, measurements
    }, null, 2));
    await api.stop();
    await planning.stopGeneration();
    // Only the generated test database may be dropped, never the database named in the URI.
    assert.equal(database.databaseName, databaseName);
    assert.match(databaseName, /^load_\d+_\d+$/);
    await database.dropDatabase();
    await mongoose.disconnect();
  }
});
