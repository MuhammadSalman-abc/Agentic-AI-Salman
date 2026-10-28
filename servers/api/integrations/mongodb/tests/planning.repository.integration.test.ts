import "dotenv/config";
import dns from "node:dns";
import test from "node:test";
import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import type { ArchitecturePlan } from "@workspace/types";
import { createPlanningRepository } from "../planning.repository.js";
import { ArchitectureVersionModel, GenerationRunModel, ProjectModel } from "../planning.models.js";

const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
const testDatabaseName = `ait_${String(process.pid)}_${String(Date.now())}`;

const plan: ArchitecturePlan = {
  brief: {
    goals: ["Verify MongoDB persistence."],
    requirements: [{
      id: "REQ-1",
      text: "Persist the complete plan atomically.",
      acceptanceCriteria: ["No partial version is visible."],
      coverage: "addressed",
      coverageExplanation: null
    }],
    constraints: [],
    assumptions: [],
    openQuestions: []
  },
  features: [{ id: "FEAT-1", title: "Persistence", description: "Persist plans.", priority: "high", requirementIds: ["REQ-1"] }],
  stories: [{
    id: "STORY-1", featureId: "FEAT-1", requirementIds: ["REQ-1"], title: "Save a plan",
    description: "As a user, I can save a plan.", acceptanceCriteria: ["The plan is retrievable."], priority: "high"
  }],
  tasks: [{
    id: "TASK-1", storyId: "STORY-1", title: "Write the plan", description: "Persist the plan version.",
    taskType: "technical_development", completionCriteria: ["The version is stored."], priority: "high", dependsOn: [], order: 1
  }]
};

const createProject = (repository: ReturnType<typeof createPlanningRepository>, name: string, context = "MongoDB repository integration test.") =>
  repository.createOrUpdateProject({ name, context });

const createRun = (repository: ReturnType<typeof createPlanningRepository>, projectId: string, idempotencyKey: string) =>
  repository.createRun({
    projectId,
    requirement: "Persist and verify an architecture plan in the isolated integration database.",
    instructions: "",
    idempotencyKey,
    provider: "test",
    model: "integration-test",
    promptVersion: "integration-test"
  });

void test("MongoDB replica-set planning repository integration", { skip: !uri }, async (context) => {
  assert.ok(uri);
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  await mongoose.connect(uri, { dbName: testDatabaseName, serverSelectionTimeoutMS: 15_000 });
  const database = mongoose.connection.db;
  assert.ok(database);
  const topology = await database.admin().command({ hello: 1 });
  assert.ok(typeof topology.setName === "string" || topology.msg === "isdbgrid", "test target must support transactions");

  const repository = createPlanningRepository();
  try {
    await Promise.all([ProjectModel.init(), GenerationRunModel.init(), ArchitectureVersionModel.init()]);

    await context.test("unique indexes enforce project, run, and version identity", async () => {
      const project = await createProject(repository, "Unique index project", "");
      await assert.rejects(
        ProjectModel.create({ name: "Duplicate", normalizedName: "unique index project", context: "duplicate test context" }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal((error as Error & { code?: number }).code, 11000, `${error.name}: ${error.message}`);
          return true;
        }
      );

      const first = await createRun(repository, project.id, "duplicate-run-key");
      assert.ok("run" in first);
      const duplicateRun = await createRun(repository, project.id, "duplicate-run-key");
      assert.ok("run" in duplicateRun);
      assert.equal(duplicateRun.run.id, first.run.id);

      await ArchitectureVersionModel.create({
        projectId: new Types.ObjectId(project.id), version: 1, basedOnVersion: null, source: "generation",
        schemaVersion: 1, runId: null, inputSnapshot: null, plan,
        validation: { passed: true, checks: [], warnings: [] }
      });
      await assert.rejects(
        ArchitectureVersionModel.create({
          projectId: new Types.ObjectId(project.id), version: 1, basedOnVersion: null, source: "generation",
          schemaVersion: 1, runId: null, inputSnapshot: null, plan,
          validation: { passed: true, checks: [], warnings: [] }
        }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal("code" in error ? error.code : undefined, 11000);
          return true;
        }
      );
    });

    await context.test("idempotency and worker claims remain unique under concurrent requests", async () => {
      const project = await createProject(repository, "Concurrency project");
      const [left, right] = await Promise.all([
        createRun(repository, project.id, "racing-idempotency-key"),
        createRun(repository, project.id, "racing-idempotency-key")
      ]);
      assert.ok("run" in left && "run" in right);
      assert.equal(left.run.id, right.run.id);

      const [claimA, claimB] = await Promise.all([repository.claimRun(left.run.id), repository.claimRun(left.run.id)]);
      assert.equal([claimA, claimB].filter(Boolean).length, 1);
    });

    await context.test("active project admission reuses identical input, rejects different input, and releases after cancellation", async () => {
      const project = await createProject(repository, "Active project admission");
      const results = await Promise.all(Array.from({ length: 8 }, (_, index) => createRun(repository, project.id, `different-key-${String(index)}`)));
      assert.ok(results.every((result) => "run" in result));
      const ids = results.flatMap((result) => "run" in result ? [result.run.id] : []);
      assert.equal(new Set(ids).size, 1);
      const different = await repository.createRun({ projectId: project.id, requirement: "Build a distinct shopping cart with stock checks.", instructions: "", idempotencyKey: "different-content", provider: "test", model: "test", promptVersion: "test" });
      assert.ok("activeConflict" in different);
      assert.equal(await GenerationRunModel.countDocuments({ projectId: project.id }), 1);
      const runId = ids[0]; assert.ok(runId);
      await repository.cancelRun(runId);
      const next = await createRun(repository, project.id, "after-cancellation");
      assert.ok("run" in next);
      assert.notEqual(next.run.id, runId);
      await repository.cancelRun(next.run.id);
    });

    await context.test("generation commits a complete version and rejects stale concurrent edits", async () => {
      const project = await createProject(repository, "Atomic commit project");
      const created = await createRun(repository, project.id, "atomic-generation");
      assert.ok("run" in created);
      assert.ok(await repository.claimRun(created.run.id));
      const usage = { inputTokens: 120, outputTokens: 80, totalTokens: 200 };
      await repository.recordUsage(created.run.id, usage);
      const savedVersion = await repository.savePlan(created.run.id, project.id, null, plan);
      assert.equal(savedVersion, 1);
      const stored = await repository.getRun(created.run.id);
      assert.ok(stored);
      assert.equal(stored.run.status, "succeeded");
      assert.equal(stored.run.resultVersion, 1);
      assert.deepEqual(stored.run.usage, usage);
      assert.deepEqual((await repository.getVersion(project.id, 1))?.usage, usage);
      assert.ok(stored.plan);
      assert.equal((await repository.getProject(project.id))?.currentVersion, 1);

      const edits = await Promise.all([
        repository.saveEditedVersion(project.id, 1, plan),
        repository.saveEditedVersion(project.id, 1, plan)
      ]);
      assert.equal(edits.filter((result) => result.kind === "saved").length, 1);
      assert.equal(edits.filter((result) => result.kind === "conflict").length, 1);
      assert.equal((await repository.listVersions(project.id))?.length, 2);
      assert.deepEqual((await repository.getVersion(project.id, 1))?.usage, usage);
      assert.equal((await repository.getVersion(project.id, 2))?.usage, null);
    });

    await context.test("cancelled runs cannot commit a version", async () => {
      const project = await createProject(repository, "Cancellation project");
      const created = await createRun(repository, project.id, "cancel-before-commit");
      assert.ok("run" in created);
      assert.ok(await repository.claimRun(created.run.id));
      assert.equal((await repository.cancelRun(created.run.id))?.kind, "cancelled");
      await assert.rejects(repository.savePlan(created.run.id, project.id, null, plan), /RUN_CANCELLED/);
      assert.equal((await repository.getProject(project.id))?.currentVersion, null);
      assert.equal((await repository.listVersions(project.id))?.length, 0);
    });

    await context.test("cancellation racing a commit leaves either a complete commit or no version", async () => {
      const project = await createProject(repository, "Cancellation race project");
      const created = await createRun(repository, project.id, "cancel-commit-race");
      assert.ok("run" in created);
      assert.ok(await repository.claimRun(created.run.id));

      await Promise.allSettled([
        repository.savePlan(created.run.id, project.id, null, plan),
        repository.cancelRun(created.run.id)
      ]);

      const saved = await repository.getRun(created.run.id);
      const versions = await repository.listVersions(project.id);
      const currentVersion = (await repository.getProject(project.id))?.currentVersion;
      assert.ok(saved);
      if (saved.run.status === "succeeded") {
        assert.equal(saved.run.resultVersion, 1);
        assert.equal(currentVersion, 1);
        assert.equal(versions?.length, 1);
      } else {
        assert.equal(saved.run.status, "cancelled");
        assert.equal(saved.run.resultVersion, null);
        assert.equal(currentVersion, null);
        assert.equal(versions?.length, 0);
      }
    });

    await context.test("a failed version insert rolls back the project pointer and run completion", async () => {
      const project = await createProject(repository, "Rollback project");
      await ArchitectureVersionModel.create({
        projectId: new Types.ObjectId(project.id), version: 1, basedOnVersion: null, source: "generation",
        schemaVersion: 1, runId: null, inputSnapshot: null, plan,
        validation: { passed: true, checks: [], warnings: [] }
      });
      const created = await createRun(repository, project.id, "rollback-run");
      assert.ok("run" in created);
      assert.ok(await repository.claimRun(created.run.id));
      await assert.rejects(repository.savePlan(created.run.id, project.id, null, plan));
      assert.equal((await repository.getProject(project.id))?.currentVersion, null);
      const run = await repository.getRun(created.run.id);
      assert.notEqual(run?.run.status, "succeeded");
      assert.equal(await ArchitectureVersionModel.countDocuments({ projectId: project.id }), 1);
    });

    await context.test("restart recovery marks active runs interrupted and leaves queued runs resumable", async () => {
      const project = await createProject(repository, "Recovery project");
      const active = await createRun(repository, project.id, "active-before-restart");
      const queuedProject = await createProject(repository, "Queued recovery project");
      const queued = await createRun(repository, queuedProject.id, "queued-before-restart");
      assert.ok("run" in active && "run" in queued);
      assert.ok(await repository.claimRun(active.run.id));

      await repository.markActiveRunsInterrupted();
      assert.equal((await repository.getRun(active.run.id))?.run.status, "failed");
      assert.ok((await repository.listQueuedRuns()).includes(queued.run.id));
    });
  } finally {
    await database.dropDatabase();
    await mongoose.disconnect();
  }
});
