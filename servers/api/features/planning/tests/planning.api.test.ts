import test from "node:test";
import assert from "node:assert/strict";
import type { Request, RequestHandler, Response } from "express";
import type { Logger } from "@workspace/logging";
import type {
  ArchitecturePlan,
  PlanningProject,
  PlanningRun,
  PlanningVersion,
  PlanningVersionComparison,
  PlanningVersionSummary
} from "@workspace/types";
import { HTTP_STATUS } from "../../../constants/index.js";
import { createErrorHandler } from "../../../middleware/errors.js";
import { createPlanningController } from "../planning.controller.js";
import { createPlanningRoutes } from "../routes/planning.route.js";
import type { PlanningHttpService } from "../planning.service.js";

const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined };
const project: PlanningProject = {
  id: "65b10f4a7133bd201158f309", name: "Example project", context: "Demo", currentVersion: 1, acceptedVersion: null
};
const run: PlanningRun = {
  id: "65b10f4a7133bd201158f310", projectId: project.id, status: "queued", stage: null,
  attempts: 0, resultVersion: null, error: null, createdAt: "2026-10-18T00:00:00.000Z", finishedAt: null
};
const plan: ArchitecturePlan = {
  brief: {
    goals: ["Ship a demo"],
    requirements: [{ id: "REQ-1", text: "Create a demo", acceptanceCriteria: ["A project can be created"], coverage: "addressed", coverageExplanation: null }],
    constraints: [], assumptions: [], openQuestions: []
  },
  features: [1, 2, 3].map((index) => ({ id: `FEAT-${String(index)}`, title: `Project capability ${String(index)}`, description: `Create project capability ${String(index)}`, priority: "high" as const, requirementIds: ["REQ-1"] })),
  stories: [1, 2, 3].map((index) => ({ id: `STORY-${String(index)}`, featureId: `FEAT-${String(index)}`, requirementIds: ["REQ-1"], title: `Create capability ${String(index)}`, description: "As a user", acceptanceCriteria: ["Project is saved"], priority: "high" as const })),
  tasks: [1, 2, 3].map((index) => ({ id: `TASK-${String(index)}`, storyId: `STORY-${String(index)}`, title: `Implement capability ${String(index)}`, description: "Create API", taskType: "technical_development" as const, completionCriteria: ["Endpoint works"], priority: "high" as const, dependsOn: [], order: index }))
};
const version: PlanningVersion = {
  projectId: project.id, version: 1, basedOnVersion: null, source: "generation", schemaVersion: 1,
  runId: run.id, inputSnapshot: { requirement: "Create a demo project", context: "Demo", instructions: "" },
  plan, validation: { passed: true, checks: ["schema"], warnings: [] }, requirementSummary: "Create a demo project", createdAt: "2026-10-18T00:00:00.000Z"
};
const summary: PlanningVersionSummary = {
  projectId: project.id, version: 1, basedOnVersion: null, source: "generation", schemaVersion: 1,
  runId: run.id, createdAt: version.createdAt, validation: version.validation,
  requirementSummary: version.inputSnapshot?.requirement ?? null
};
const comparison: PlanningVersionComparison = {
  fromVersion: 1, toVersion: 2,
  changes: {
    features: { added: [], removed: [], changed: [] },
    stories: { added: [], removed: [], changed: [] },
    tasks: { added: [], removed: [], changed: [] },
    requirements: { added: [], removed: [], changed: [] }
  }
};

const service: PlanningHttpService = {
  createProject: (input) => Promise.resolve({ ...project, ...input }),
  listProjects: () => Promise.resolve([project]),
  getProject: () => Promise.resolve(project),
  updateProject: (_id, input) => Promise.resolve({ ...project, ...input }),
  createRun: () => Promise.resolve(run),
  getRun: () => Promise.resolve({ run, plan: null }),
  cancelRun: () => Promise.resolve({ ...run, status: "cancelled", error: { code: "run_cancelled", message: "Cancelled" } }),
  listVersions: () => Promise.resolve([summary]),
  deleteVersion: () => Promise.resolve(),
  findSavedRequirement: () => Promise.resolve(null),
  getVersion: () => Promise.resolve(version),
  editVersion: () => Promise.resolve({ ...version, version: 2, basedOnVersion: 1, source: "user-edit", runId: null }),
  acceptVersion: () => Promise.resolve({ ...project, acceptedVersion: 1 }),
  compareVersions: () => Promise.resolve(comparison)
};
const controller = createPlanningController({ service });

type RequestInput = Readonly<{
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}>;

const invoke = async (handler: RequestHandler, input: RequestInput = {}) => {
  let statusCode: number = HTTP_STATUS.ok;
  let body: unknown;
  const request = {
    body: input.body,
    params: input.params ?? {},
    query: input.query ?? {},
    get: (name: string) => input.headers?.[name.toLowerCase()]
  } as unknown as Request;
  const response = {
    status: (status: number) => { statusCode = status; return response; },
    json: (value: unknown) => { body = value; return response; }
  } as unknown as Response;
  await handler(request, response, () => undefined);
  return { statusCode, body };
};

void test("project CRUD controller contracts use documented status and response envelopes", async () => {
  const created = await invoke(controller.createProject, { body: { name: project.name, context: project.context } });
  assert.equal(created.statusCode, HTTP_STATUS.created);
  assert.deepEqual(created.body, { project });

  const listed = await invoke(controller.listProjects, { query: { limit: "25" } });
  assert.deepEqual(listed.body, { projects: [project] });

  const read = await invoke(controller.getProject, { params: { projectId: project.id } });
  assert.deepEqual(read.body, { project });

  const updated = await invoke(controller.updateProject, { params: { projectId: project.id }, body: { context: "Updated" } });
  assert.deepEqual(updated.body, { project: { ...project, context: "Updated" } });
});

void test("all documented planning API routes are registered", () => {
  const router = createPlanningRoutes(service) as unknown as Readonly<{
    stack: readonly Readonly<{ route?: Readonly<{ path: string; methods: Readonly<Record<string, boolean>> }> }>[];
  }>;
  const routes = router.stack.flatMap(({ route }) => route
    ? Object.keys(route.methods).filter((method) => route.methods[method]).map((method) => `${method.toUpperCase()} ${route.path}`)
    : []);
  for (const expected of [
    "POST /api/projects", "GET /api/projects", "GET /api/projects/:projectId", "PATCH /api/projects/:projectId",
    "POST /api/projects/:projectId/generation-runs", "GET /api/generation-runs/:runId",
    "POST /api/generation-runs/:runId/cancel", "GET /api/projects/:projectId/versions",
    "GET /api/projects/:projectId/versions/compare", "POST /api/projects/:projectId/versions",
    "GET /api/projects/:projectId/versions/:version", "DELETE /api/projects/:projectId/versions/:version",
    "POST /api/projects/:projectId/versions/:version/accept"
  ]) assert.ok(routes.includes(expected), `missing route ${expected}`);
});

void test("generation controller contracts require idempotency and expose create, status, and cancel", async () => {
  await assert.rejects(() => invoke(controller.createRun, {
    params: { projectId: project.id }, body: { requirement: "Create a demo project and save it" }
  }));

  const created = await invoke(controller.createRun, {
    params: { projectId: project.id }, headers: { "idempotency-key": "api-contract-run-1" },
    body: { requirement: "Create a demo project and save it" }
  });
  assert.equal(created.statusCode, HTTP_STATUS.accepted);
  assert.deepEqual(created.body, { run });

  const status = await invoke(controller.getRun, { params: { runId: run.id } });
  assert.deepEqual(status.body, { run, plan: null });

  const cancelled = await invoke(controller.cancelRun, { params: { runId: run.id } });
  assert.equal(cancelled.statusCode, HTTP_STATUS.accepted);
  assert.equal((cancelled.body as { run: PlanningRun }).run.status, "cancelled");
});

void test("version history, detail, edit, acceptance, and comparison contracts are exposed", async () => {
  const history = await invoke(controller.listVersions, { params: { projectId: project.id } });
  assert.deepEqual(history.body, { versions: [summary] });

  const detail = await invoke(controller.getVersion, { params: { projectId: project.id, version: "1" } });
  assert.deepEqual(detail.body, { version });

  const edit = await invoke(controller.editVersion, { params: { projectId: project.id }, body: { baseVersion: 1, plan } });
  assert.equal(edit.statusCode, HTTP_STATUS.created);
  assert.equal((edit.body as { version: PlanningVersion }).version.source, "user-edit");

  const accepted = await invoke(controller.acceptVersion, { params: { projectId: project.id, version: "1" } });
  assert.deepEqual(accepted.body, { project: { ...project, acceptedVersion: 1 } });

  const compared = await invoke(controller.compareVersions, { params: { projectId: project.id }, query: { from: "1", to: "2" } });
  assert.deepEqual(compared.body, { comparison });
});

void test("error middleware returns stable request IDs and omits submitted input", async () => {
  let statusCode = 0;
  let body: unknown;
  const response = {
    getHeader: () => "request-123",
    status: (status: number) => { statusCode = status; return response; },
    json: (value: unknown) => { body = value; return response; }
  } as unknown as Response;
  let validationError: unknown;
  await assert.rejects(() => invoke(controller.createProject, { body: { name: "x", secret: "do-not-echo" } }), (error: unknown) => {
    validationError = error;
    return true;
  });
  createErrorHandler({ logger })(validationError, {} as Request, response, () => undefined);
  assert.equal(statusCode, HTTP_STATUS.badRequest);
  const payload = body as { error: { requestId: string; details: readonly Record<string, unknown>[] } };
  assert.equal(payload.error.requestId, "request-123");
  assert.ok(payload.error.details.length > 0);
  assert.ok(payload.error.details.every((detail) => !("input" in detail)));
  assert.ok(!JSON.stringify(payload).includes("do-not-echo"));
});
