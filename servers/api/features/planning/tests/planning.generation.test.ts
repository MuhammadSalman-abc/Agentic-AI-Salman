import test from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "@workspace/logging";
import type { PlanningRun } from "@workspace/types";
import { createPlanningService } from "../planning.service.js";
import { validateAndOrderPlan } from "../planning.validation.js";
import { LlmProviderError, type LlmGenerationRequest, type LlmProvider } from "../../../integrations/llm/provider.js";

const projectId = "65b10f4a7133bd201158f309";
const runId = "65b10f4a7133bd201158f310";
const run: PlanningRun = {
  id: runId,
  projectId,
  status: "queued",
  stage: null,
  attempts: 0,
  resultVersion: null,
  error: null,
  createdAt: "2026-10-19T00:00:00.000Z",
  finishedAt: null
};

const logger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const createPlannerResult = (featureCount: number) => {
  const features = Array.from({ length: featureCount }, (_, index) => ({
    id: `FEAT-${String(index + 1)}`,
    title: `Feature ${String(index + 1)}`,
    description: `Capability ${String(index + 1)}`,
    priority: "medium" as const,
    requirementIds: ["REQ-1"]
  }));
  const stories = features.map((feature, index) => ({
    id: `STORY-${String(index + 1)}`,
    featureId: feature.id,
    requirementIds: ["REQ-1"],
    title: `Story ${String(index + 1)}`,
    description: `As a user, I can use capability ${String(index + 1)}.`,
    acceptanceCriteria: ["The capability works."],
    priority: "medium" as const
  }));
  const tasks = stories.map((story, index) => ({
    id: `TASK-${String(index + 1)}`,
    storyId: story.id,
    title: `Task ${String(index + 1)}`,
    description: `Implement capability ${String(index + 1)}.`,
    taskType: "technical_development" as const,
    completionCriteria: ["Implementation is complete."],
    priority: "medium" as const,
    dependsOn: [],
    order: index + 1
  }));
  return {
    features,
    stories,
    tasks,
    requirementCoverage: [{ requirementId: "REQ-1", coverage: "addressed" as const, explanation: null }]
  };
};

const createPlan = (featureCount: number) => {
  const planner = createPlannerResult(featureCount);
  return {
    brief: {
      goals: ["Build the requested product."],
      requirements: [{
        id: "REQ-1",
        text: "Build the requested product with the listed capabilities.",
        acceptanceCriteria: ["The requested capabilities are available."],
        coverage: "addressed" as const,
        coverageExplanation: null
      }],
      constraints: [],
      assumptions: [],
      openQuestions: []
    },
    features: planner.features,
    stories: planner.stories,
    tasks: planner.tasks
  };
};

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
};

type GenerationHarnessOptions = Readonly<{
  generateJson?: (request: LlmGenerationRequest, generateValidResponse: () => Promise<unknown>) => Promise<unknown>;
  cancellationChecks?: readonly boolean[];
}>;

const createGenerationHarness = (featureCount: number, options: GenerationHarnessOptions = {}) => {
  const saved = createDeferred<ReturnType<typeof validateAndOrderPlan>>();
  const failedRun = createDeferred<Readonly<{ code: string; message: string }>>();
  const cancelledRun = createDeferred<Readonly<{ code: string; message: string }>>();
  const requests: LlmGenerationRequest[] = [];
  let savedPlan: ReturnType<typeof validateAndOrderPlan> | undefined;
  let failed = false;
  let cancelled = false;
  let failure: Readonly<{ code: string; message: string }> | undefined;
  let cancellationIndex = 0;
  const stageUpdates: Array<Readonly<{ stage: string; attempt: number }>> = [];

  const generateValidResponse = (request: LlmGenerationRequest): Promise<unknown> => {
    if (request.stage === "analyzing") {
      return Promise.resolve({
        goals: ["Build the requested product."],
        requirements: [{ id: "REQ-1", text: "Build the requested product with the listed capabilities.", acceptanceCriteria: ["The requested capabilities are available."] }],
        constraints: [], assumptions: [], openQuestions: []
      });
    }
    if (request.stage === "planning") {
      const result = createPlannerResult(featureCount);
      return Promise.resolve({ features: result.features, stories: result.stories, requirementCoverage: result.requirementCoverage });
    }
    if (request.stage === "decomposing") return Promise.resolve({ tasks: createPlannerResult(featureCount).tasks });
    return Promise.reject(new Error(`Unexpected generation stage: ${request.stage}`));
  };

  const provider: LlmProvider = {
    name: "groq",
    model: "test-model",
    generateJson: (request) => {
      requests.push(request);
      return options.generateJson
        ? options.generateJson(request, () => generateValidResponse(request))
        : generateValidResponse(request);
    }
  };

  const repository = {
    createRun: () => Promise.resolve({ conflict: false as const, created: true, run }),
    isValidProjectId: () => true,
    claimRun: () => Promise.resolve({ id: runId, projectId }),
    getRunForWorker: () => Promise.resolve({
      id: runId,
      projectId,
      requirement: "Build the requested product with the listed capabilities.",
      instructions: "",
      contextSnapshot: "",
      baseVersion: null
    }),
    updateStage: (id: string, stage: string, attempt: number) => {
      stageUpdates.push({ stage, attempt });
      return Promise.resolve(undefined);
    },
    isRunCancelled: () => {
      const checks = options.cancellationChecks ?? [];
      const value = checks[Math.min(cancellationIndex, Math.max(checks.length - 1, 0))] ?? false;
      cancellationIndex += 1;
      cancelled ||= value;
      return Promise.resolve(cancelled);
    },
    savePlan: (_runId: string, _projectId: string, _baseVersion: number | null, plan: ReturnType<typeof validateAndOrderPlan>) => {
      savedPlan = plan;
      saved.resolve(plan);
      return Promise.resolve(1);
    },
    failRun: (_id: string, code: string, message: string) => {
      if (cancelled && code === "RUN_CANCELLED") {
        cancelledRun.resolve({ code, message });
        return Promise.resolve(undefined);
      }
      failed = true;
      failure = { code, message };
      failedRun.resolve({ code, message });
      return Promise.resolve(undefined);
    }
  } as unknown as Parameters<typeof createPlanningService>[0]["repository"];

  const service = createPlanningService({
    repository,
    provider,
    configuration: { provider: "groq", model: "test-model", apiKey: "test-key", timeoutMs: 1000 },
    persistenceAvailable: true,
    logger
  });

  return {
    service, requests, saved, failedRun, cancelledRun, stageUpdates,
    getSavedPlan: () => savedPlan,
    getFailure: () => failure,
    wasFailed: () => failed
  };
};

const waitForGeneration = (harness: ReturnType<typeof createGenerationHarness>) => Promise.race([
  harness.saved.promise.then((plan) => ({ kind: "saved" as const, plan })),
  harness.failedRun.promise.then((result) => ({ kind: "failed" as const, result })),
  harness.cancelledRun.promise.then((result) => ({ kind: "cancelled" as const, result }))
]);

void test("whole-plan validation accepts six and seven Features without truncation", () => {
  for (const featureCount of [6, 7]) {
    const plan = validateAndOrderPlan(createPlan(featureCount));
    assert.equal(plan.features.length, featureCount);
    assert.equal(plan.stories.length, featureCount);
    assert.equal(plan.tasks.length, featureCount);
  }
});

void test("planner prompt targets at least three Features while a valid seven-Feature plan is saved intact", async () => {
  const harness = createGenerationHarness(7);
  await harness.service.createRun({
    projectId,
    requirement: "Build the requested product with the listed capabilities.",
    idempotencyKey: "feature-count-7"
  });

  const completion = await Promise.race([
    harness.saved.promise.then((plan) => ({ plan })),
    harness.failedRun.promise.then((failure) => ({ failure }))
  ]);
  if ("failure" in completion) assert.fail(`Generation failed: ${completion.failure.code}: ${completion.failure.message}`);
  const savedPlan = completion.plan;
  const plannerRequest = harness.requests.find(({ stage }) => stage === "planning");
  assert.ok(plannerRequest);
  assert.match(plannerRequest.systemInstructions, /between 3 and 10 meaningful Features, and never return more than 10/i);
  assert.equal(savedPlan.features.length, 7);
  assert.equal(harness.getSavedPlan()?.features.length, 7);
  assert.equal(harness.wasFailed(), false);
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["analyzing", "planning", "decomposing"]);
});

void test("transient provider failure retries only the active stage and then completes", async () => {
  let analyzingCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: (request, generateValidResponse) => {
      if (request.stage === "analyzing" && analyzingCalls === 0) {
        analyzingCalls += 1;
        return Promise.reject(new LlmProviderError("provider_network_error", "Network unavailable.", true));
      }
      if (request.stage === "analyzing") analyzingCalls += 1;
      return generateValidResponse();
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "transient-retry" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "saved");
  assert.equal(analyzingCalls, 2);
  assert.deepEqual(harness.stageUpdates.filter(({ stage }) => stage === "analyzing").map(({ attempt }) => attempt), [1, 2]);
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["analyzing", "analyzing", "planning", "decomposing"]);
  assert.equal(harness.wasFailed(), false);
});

void test("correctable schema failure retries with validation findings", async () => {
  let analyzingCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: (request, generateValidResponse) => {
      if (request.stage !== "analyzing") return generateValidResponse();
      analyzingCalls += 1;
      if (analyzingCalls === 1) return Promise.resolve({ goals: [] });
      return generateValidResponse();
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "schema-retry" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "saved");
  assert.equal(analyzingCalls, 2);
  assert.deepEqual(harness.stageUpdates.filter(({ stage }) => stage === "analyzing").map(({ attempt }) => attempt), [1, 2]);
  const correctedRequest = harness.requests[1];
  assert.ok(correctedRequest);
  assert.ok(typeof correctedRequest.input === "object" && correctedRequest.input !== null && "validationFindings" in correctedRequest.input);
});

void test("retryable failure stops after the bounded third attempt and never saves a version", async () => {
  let analyzingCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: (request, generateValidResponse) => {
      if (request.stage !== "analyzing") return generateValidResponse();
      analyzingCalls += 1;
      return Promise.reject(new LlmProviderError("provider_network_error", "Network unavailable.", true));
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "retry-exhausted" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "failed");
  assert.equal(analyzingCalls, 3);
  assert.deepEqual(harness.stageUpdates.filter(({ stage }) => stage === "analyzing").map(({ attempt }) => attempt), [1, 2, 3]);
  assert.equal(harness.getFailure()?.code, "provider_network_error");
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("non-retryable provider failure is returned after one attempt and saves no version", async () => {
  let analyzingCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: (request, generateValidResponse) => {
      if (request.stage !== "analyzing") return generateValidResponse();
      analyzingCalls += 1;
      return Promise.reject(new LlmProviderError("invalid_api_key", "Provider authentication failed.", false));
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "non-retryable-provider-error" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "failed");
  assert.equal(analyzingCalls, 1);
  assert.equal(harness.getFailure()?.code, "invalid_api_key");
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("cancellation before the first provider call stops generation without saving", async () => {
  let providerCalls = 0;
  const harness = createGenerationHarness(3, {
    cancellationChecks: [true],
    generateJson: (_request, generateValidResponse) => {
      providerCalls += 1;
      return generateValidResponse();
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "cancel-before-stage" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "cancelled");
  assert.equal(providerCalls, 0);
  assert.equal(completion.result.code, "RUN_CANCELLED");
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("cancellation after a stage response prevents the next stage and persistence", async () => {
  const harness = createGenerationHarness(3, { cancellationChecks: [false, true] });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "cancel-between-stages" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "cancelled");
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["analyzing"]);
  assert.equal(completion.result.code, "RUN_CANCELLED");
  assert.equal(harness.getSavedPlan(), undefined);
});
