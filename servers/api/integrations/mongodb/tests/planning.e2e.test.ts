import "dotenv/config";
import dns from "node:dns";
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createApp } from "../../../bootstrap/create-app.js";
import { createServer } from "../../../bootstrap/create-server.js";
import { createPlanningRepository, createPlanningService } from "../../../features/planning/index.js";
import { createPlanningFixtureProvider } from "./planning.fixture.js";
import { ArchitectureVersionModel, GenerationRunModel, ProjectModel } from "../planning.models.js";
import type { Logger } from "@workspace/logging";
import type { ArchitecturePlan, PlanningTokenUsage } from "@workspace/types";

const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
const testDatabaseName = `e2e_${String(process.pid)}_${String(Date.now())}`;

const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };

void test("HTTP requirement submission generates and retrieves a MongoDB-backed plan", { skip: !uri }, async () => {
  assert.ok(uri);
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  await mongoose.connect(uri, { dbName: testDatabaseName, serverSelectionTimeoutMS: 15_000 });
  const database = mongoose.connection.db;
  assert.ok(database);
  const topology = await database.admin().command({ hello: 1 });
  assert.ok(typeof topology.setName === "string" || topology.msg === "isdbgrid", "E2E target must support transactions");
  await Promise.all([ProjectModel.init(), GenerationRunModel.init(), ArchitectureVersionModel.init()]);

  const planning = createPlanningService({
    repository: createPlanningRepository(),
    provider: createPlanningFixtureProvider(),
    configuration: { provider: "groq", model: "e2e-fake-model", apiKey: "test-only-key", timeoutMs: 1_000 },
    persistenceAvailable: true,
    logger
  });
  const app = createApp({
    config: { environment: "test", host: "127.0.0.1", port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" },
    logger,
    planning
  });
  const api = createServer({
    app,
    config: { environment: "test", host: "127.0.0.1", port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" },
    logger
  });

  try {
    await api.start();
    const address = api.raw.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${String(address.port)}`;

    const projectResponse = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "E2E requirements project", context: "" })
    });
    assert.equal(projectResponse.status, 201);
    const projectPayload = await projectResponse.json() as { project: { id: string; currentVersion: number | null } };
    const project = projectPayload.project;
    assert.equal(project.currentVersion, null);

    const generationResponse = await fetch(`${baseUrl}/api/projects/${project.id}/generation-runs`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "e2e-requirement-generation-1" },
      body: JSON.stringify({ requirement: "Persist a generated plan and allow the saved version to be retrieved." })
    });
    assert.equal(generationResponse.status, 202);
    const generationPayload = await generationResponse.json() as { run: { id: string; status: string } };
    const runId = generationPayload.run.id;

    let runStatus: { status: string; resultVersion: number | null; error: { code: string; message: string } | null } | undefined;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const statusResponse = await fetch(`${baseUrl}/api/generation-runs/${runId}`);
      assert.equal(statusResponse.status, 200);
      const statusPayload = await statusResponse.json() as { run: typeof runStatus };
      runStatus = statusPayload.run;
      if (runStatus?.status === "succeeded" || runStatus?.status === "failed" || runStatus?.status === "cancelled") break;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    assert.ok(runStatus, "generation run should return status");
    assert.equal(runStatus.status, "succeeded", runStatus.error?.message ?? "generation did not complete");
    assert.equal(runStatus.resultVersion, 1);

    const versionResponse = await fetch(`${baseUrl}/api/projects/${project.id}/versions/1`);
    assert.equal(versionResponse.status, 200);
    const versionPayload = await versionResponse.json() as {
      version: { source: string; runId: string; usage: PlanningTokenUsage | null; plan: ArchitecturePlan }
    };
    assert.equal(versionPayload.version.source, "generation");
    assert.equal(versionPayload.version.runId, runId);
    assert.deepEqual(versionPayload.version.usage, { inputTokens: 80, outputTokens: 60, totalTokens: 140 });
    assert.deepEqual(versionPayload.version.plan.features.map(({ id }) => id), ["FEAT-E2E-1", "FEAT-E2E-2", "FEAT-E2E-3"]);
    assert.deepEqual(versionPayload.version.plan.stories.map(({ featureId }) => featureId), ["FEAT-E2E-1", "FEAT-E2E-2", "FEAT-E2E-3"]);
    assert.deepEqual([...new Set(versionPayload.version.plan.tasks.map(({ storyId }) => storyId))].sort(), ["STORY-E2E-1", "STORY-E2E-2", "STORY-E2E-3"]);

    const updatedProjectResponse = await fetch(`${baseUrl}/api/projects/${project.id}`);
    assert.equal(updatedProjectResponse.status, 200);
    const updatedProject = await updatedProjectResponse.json() as { project: { currentVersion: number | null } };
    assert.equal(updatedProject.project.currentVersion, 1);

    const originalPlan = versionPayload.version.plan;
    const editedPlan = { ...originalPlan, features: originalPlan.features.map((feature, index) => index === 0 ? { ...feature, title: "Updated plan storage" } : feature) };
    const editResponse = await fetch(`${baseUrl}/api/projects/${project.id}/versions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ baseVersion: 1, plan: editedPlan })
    });
    assert.equal(editResponse.status, 201);
    const editedPayload = await editResponse.json() as { version: { version: number; source: string; usage: PlanningTokenUsage | null; plan: ArchitecturePlan } };
    assert.equal(editedPayload.version.version, 2);
    assert.equal(editedPayload.version.source, "user-edit");
    assert.equal(editedPayload.version.usage, null);
    assert.equal(editedPayload.version.plan.features[0]?.title, "Updated plan storage");
    const originalAgain = await fetch(`${baseUrl}/api/projects/${project.id}/versions/1`);
    const originalPayload = await originalAgain.json() as typeof versionPayload;
    assert.equal(originalPayload.version.plan.features[0]?.title, originalPlan.features[0]?.title);
    assert.deepEqual(originalPayload.version.usage, versionPayload.version.usage);
    const staleEdit = await fetch(`${baseUrl}/api/projects/${project.id}/versions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ baseVersion: 1, plan: editedPlan })
    });
    assert.equal(staleEdit.status, 409);
  } finally {
    await api.stop();
    await database.dropDatabase();
    await mongoose.disconnect();
  }
});
