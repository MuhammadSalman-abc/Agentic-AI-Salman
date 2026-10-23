import "dotenv/config";
import dns from "node:dns";
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createApp } from "../../../bootstrap/create-app.js";
import { createServer } from "../../../bootstrap/create-server.js";
import { createPlanningRepository, createPlanningService } from "../../../features/planning/index.js";
import type { LlmGenerationRequest, LlmProvider } from "../../llm/provider.js";
import { ArchitectureVersionModel, GenerationRunModel, ProjectModel } from "../planning.models.js";
import type { Logger } from "@workspace/logging";

const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
const testDatabaseName = `e2e_${String(process.pid)}_${String(Date.now())}`;

const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };

const createProvider = (): LlmProvider => ({
  name: "groq",
  model: "e2e-fake-model",
  generateJson: ({ stage }: LlmGenerationRequest): Promise<unknown> => {
    if (stage === "analyzing") return Promise.resolve({
      goals: ["Allow the user to save an architecture plan."],
      requirements: [{
        id: "REQ-E2E-1", text: "The API must persist a generated plan.",
        acceptanceCriteria: ["A saved plan can be retrieved by version."]
      }],
      constraints: [], assumptions: [], openQuestions: []
    });
    if (stage === "planning") return Promise.resolve({
      features: [
        { id: "FEAT-E2E-1", title: "Plan version storage", description: "Save generated plans as immutable versions.", priority: "high", requirementIds: ["REQ-E2E-1"] },
        { id: "FEAT-E2E-2", title: "Plan version retrieval", description: "Retrieve a saved plan by its project and version.", priority: "high", requirementIds: ["REQ-E2E-1"] },
        { id: "FEAT-E2E-3", title: "Project version history", description: "Keep the project's current version pointer consistent.", priority: "medium", requirementIds: ["REQ-E2E-1"] }
      ],
      stories: [
        { id: "STORY-E2E-1", featureId: "FEAT-E2E-1", requirementIds: ["REQ-E2E-1"], title: "Persist a generated plan", description: "As a user, I can save a validated plan as a version.", acceptanceCriteria: ["The complete plan and version metadata are stored atomically."], priority: "high" },
        { id: "STORY-E2E-2", featureId: "FEAT-E2E-2", requirementIds: ["REQ-E2E-1"], title: "Retrieve a saved plan", description: "As a user, I can load the complete plan by version.", acceptanceCriteria: ["The version API returns the complete plan."], priority: "high" },
        { id: "STORY-E2E-3", featureId: "FEAT-E2E-3", requirementIds: ["REQ-E2E-1"], title: "Track the current plan version", description: "As a user, I can see the project's current saved version.", acceptanceCriteria: ["The project points to the version created by generation."], priority: "medium" }
      ],
      requirementCoverage: [{ requirementId: "REQ-E2E-1", coverage: "addressed", explanation: null }]
    });
    if (stage === "decomposing") return Promise.resolve({
      tasks: [
        { id: "TASK-E2E-1", storyId: "STORY-E2E-1", title: "Persist plan version", description: "Save the validated plan and its version metadata.", taskType: "technical_development", completionCriteria: ["The version is written atomically."], priority: "high", dependsOn: [], order: 1 },
        { id: "TASK-E2E-2", storyId: "STORY-E2E-2", title: "Read plan version by number", description: "Load the complete saved plan through the version endpoint.", taskType: "technical_development", completionCriteria: ["The API can read the saved version."], priority: "high", dependsOn: ["TASK-E2E-1"], order: 2 },
        { id: "TASK-E2E-3", storyId: "STORY-E2E-3", title: "Update current version pointer", description: "Point the project to the newly committed version.", taskType: "technical_development", completionCriteria: ["The project currentVersion is one."], priority: "medium", dependsOn: ["TASK-E2E-1"], order: 3 }
      ]
    });
    return Promise.reject(new Error(`Unexpected E2E provider stage: ${stage}`));
  }
});

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
    provider: createProvider(),
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
      version: { source: string; runId: string; plan: { features: readonly { id: string }[]; stories: readonly { featureId: string }[]; tasks: readonly { storyId: string }[] } }
    };
    assert.equal(versionPayload.version.source, "generation");
    assert.equal(versionPayload.version.runId, runId);
    assert.deepEqual(versionPayload.version.plan.features.map(({ id }) => id), ["FEAT-E2E-1", "FEAT-E2E-2", "FEAT-E2E-3"]);
    assert.deepEqual(versionPayload.version.plan.stories.map(({ featureId }) => featureId), ["FEAT-E2E-1", "FEAT-E2E-2", "FEAT-E2E-3"]);
    assert.deepEqual(versionPayload.version.plan.tasks.map(({ storyId }) => storyId), ["STORY-E2E-1", "STORY-E2E-2", "STORY-E2E-3"]);

    const updatedProjectResponse = await fetch(`${baseUrl}/api/projects/${project.id}`);
    assert.equal(updatedProjectResponse.status, 200);
    const updatedProject = await updatedProjectResponse.json() as { project: { currentVersion: number | null } };
    assert.equal(updatedProject.project.currentVersion, 1);
  } finally {
    await api.stop();
    await database.dropDatabase();
    await mongoose.disconnect();
  }
});
