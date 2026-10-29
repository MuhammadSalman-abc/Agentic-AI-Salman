import test from "node:test";
import assert from "node:assert/strict";
import type { Logger } from "@workspace/logging";
import type { PlanningRun, PlanningTokenUsage } from "@workspace/types";
import { createPlanningService } from "../planning.service.js";
import { validateAndOrderPlan } from "../planning.validation.js";
import { completeMissingTestCoverage } from "../planning-test-coverage.js";
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
  const tasks = stories.flatMap((story, index) => [{
    id: `TASK-${String(index + 1)}`,
    storyId: story.id,
    title: `Task ${String(index + 1)}`,
    description: `Implement capability ${String(index + 1)}.`,
    taskType: "technical_development" as const,
    layer: "backend" as const,
    acceptanceCriteriaIndexes: [1],
    completionCriteria: ["Implementation is complete."],
    priority: "medium" as const,
    dependsOn: [],
    order: index + 1
  }, {
    id: `TEST-${String(index + 1)}`, storyId: story.id,
    title: `Verify capability ${String(index + 1)}`, description: "Verify valid and invalid input responses.",
    taskType: "testing" as const, layer: "testing" as const, acceptanceCriteriaIndexes: [1],
    completionCriteria: ["Valid requests return the expected result; invalid requests leave saved data unchanged."],
    priority: "medium" as const, dependsOn: [`TASK-${String(index + 1)}`], order: index + 2
  }] );
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
  queueLimits?: Readonly<{ concurrency: number; maxQueued: number }>;
}>;

const createGenerationHarness = (featureCount: number, options: GenerationHarnessOptions = {}) => {
  const saved = createDeferred<ReturnType<typeof validateAndOrderPlan>>();
  const failedRun = createDeferred<Readonly<{ code: string; message: string }>>();
  const cancelledRun = createDeferred<Readonly<{ code: string; message: string }>>();
  const requests: LlmGenerationRequest[] = [];
  const recordedUsage: PlanningTokenUsage[] = [];
  let savedPlan: ReturnType<typeof validateAndOrderPlan> | undefined;
  let failed = false;
  let cancelled = false;
  let failure: Readonly<{ code: string; message: string }> | undefined;
  let cancellationIndex = 0;
  const stageUpdates: Array<Readonly<{ stage: string; attempt: number }>> = [];

  const generateValidResponse = (request: LlmGenerationRequest): Promise<unknown> => {
    if (request.stage === "planning") return Promise.resolve(createPlan(featureCount));
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
    recordUsage: (_id: string, usage: PlanningTokenUsage) => { recordedUsage.push(usage); return Promise.resolve(undefined); },
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
    logger,
    ...(options.queueLimits ? { queueLimits: options.queueLimits } : {})
  });

  return {
    service, requests, saved, failedRun, cancelledRun, stageUpdates, recordedUsage,
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

void test("full generation queue rejects admission before another provider call", async () => {
  const blocker = createDeferred<undefined>();
  const harness = createGenerationHarness(3, { queueLimits: { concurrency: 1, maxQueued: 0 },
    generateJson: async (_request, generateValidResponse) => { await blocker.promise; return generateValidResponse(); } });
  try {
    await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "first" });
    await assert.rejects(harness.service.createRun({ projectId, requirement: "Build another product with a separate capability.", idempotencyKey: "overflow" }),
      (error: unknown) => { assert.ok(error instanceof Error && "code" in error); assert.equal(error.code, "generation_queue_full"); return true; });
  } finally { blocker.resolve(undefined); }
  await waitForGeneration(harness);
  await harness.service.stopGeneration();
  assert.equal(harness.requests.length, 1);
});

void test("whole-plan validation accepts six and seven Features without truncation", () => {
  for (const featureCount of [6, 7]) {
    const plan = validateAndOrderPlan(createPlan(featureCount));
    assert.equal(plan.features.length, featureCount);
    assert.equal(plan.stories.length, featureCount);
    assert.equal(plan.tasks.length, featureCount * 2);
  }
});

void test("plan validation accepts optional design, infrastructure, and documentation task types", () => {
  const plan = createPlan(3);
  const supportedTaskTypes = ["design", "infrastructure", "documentation"] as const;
  const planWithOptionalTaskTypes = {
    ...plan,
    tasks: plan.tasks.map((task, index) => ({ ...task, taskType: supportedTaskTypes[index] ?? task.taskType }))
  };

  const validated = validateAndOrderPlan(planWithOptionalTaskTypes);
  for (const taskType of supportedTaskTypes) assert.ok(validated.tasks.some((task) => task.taskType === taskType));
});

void test("generation validation requires implementation and test Tasks for each acceptance criterion", () => {
  const plan = createPlan(3);
  const linkedPlan = {
    ...plan,
    tasks: plan.tasks.flatMap((task) => [
      { ...task, acceptanceCriteriaIndexes: [1] },
      { ...task, id: `TEST-${task.id}`, taskType: "testing" as const, acceptanceCriteriaIndexes: [1] }
    ])
  };
  const invalidPlan = {
    ...linkedPlan,
    tasks: linkedPlan.tasks.map((task) => ({ ...task, acceptanceCriteriaIndexes: [] }))
  };

  assert.doesNotThrow(() => validateAndOrderPlan(linkedPlan, { requireAcceptanceCriteriaCoverage: true }));
  assert.throws(
    () => validateAndOrderPlan(invalidPlan, { requireAcceptanceCriteriaCoverage: true }),
    /acceptance criterion 1 has no implementation task/
  );
});

void test("new plans require task layers while legacy plans remain readable", () => {
  const plan = createPlan(3);
  const missingLayers = { ...plan, tasks: plan.tasks.map(({ layer: _layer, ...task }) => task) };
  assert.doesNotThrow(() => validateAndOrderPlan(missingLayers));
  assert.throws(() => validateAndOrderPlan(missingLayers, { requireTaskLayers: true }), /needs exactly one layer/);
});

void test("testing layers are normalized without another provider call or changing task content", async () => {
  for (const layer of ["backend", "frontend", "data", "integration", undefined]) {
    const plan = createPlan(3);
    const candidate = { ...plan, tasks: plan.tasks.map((task) => {
      if (task.taskType !== "testing") return task;
      return { ...task, layer };
    }) };
    const original = structuredClone(candidate);
    const harness = createGenerationHarness(3, { generateJson: () => Promise.resolve(candidate) });
    await harness.service.createRun({ projectId, requirement: "As a user, I want to upload my resume and get AI suggestions so that I can improve my chances of getting a job.", idempotencyKey: `test-layer-${String(layer)}` });
    const completion = await waitForGeneration(harness);
    assert.equal(completion.kind, "saved");
    assert.equal(harness.requests.length, 1);
    assert.deepEqual(candidate, original, "Provider response must not be mutated");
    for (const task of completion.plan.tasks) {
      const expected = plan.tasks.find(({ id }) => id === task.id);
      assert.ok(expected);
      assert.equal(task.layer, expected.layer);
      assert.equal(task.description, expected.description);
      assert.deepEqual(task.dependsOn, expected.dependsOn);
      assert.deepEqual(task.acceptanceCriteriaIndexes, expected.acceptanceCriteriaIndexes);
    }
  }
});

void test("strict validation still rejects mismatched task types and layers", () => {
  const plan = createPlan(3);
  assert.throws(() => validateAndOrderPlan({ ...plan, tasks: plan.tasks.map((task) => task.taskType === "testing" ? { ...task, layer: "backend" } : task) }, { requireTaskLayers: true }), /must use the testing layer/);
  assert.throws(() => validateAndOrderPlan({ ...plan, tasks: plan.tasks.map((task) => task.taskType === "technical_development" ? { ...task, layer: "testing" } : task) }, { requireTaskLayers: true }), /needs a backend, frontend, data, or integration layer/);
});

void test("one provider call returns the complete plan and preserves seven Features", async () => {
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
  const plannerRequest = harness.requests[0];
  assert.ok(plannerRequest);
  assert.match(plannerRequest.systemInstructions, /between 3 and 10 meaningful Features, and never return more than 10/i);
  assert.match(plannerRequest.systemInstructions, /include only requested capabilities/i);
  assert.match(plannerRequest.systemInstructions, /As a \[role\], I want \[capability\] so that \[benefit\]/i);
  assert.match(plannerRequest.systemInstructions, /Every acceptance criterion needs both an implementation task and a test task/i);
  assert.match(plannerRequest.systemInstructions, /do not mark everything high/i);
  assert.match(plannerRequest.systemInstructions, /design, infrastructure, or documentation/i);
  assert.match(plannerRequest.systemInstructions, /acceptanceCriteriaIndexes/i);
  assert.match(plannerRequest.systemInstructions, /unique sequential task IDs such as T1, T2/i);
  assert.match(plannerRequest.systemInstructions, /payment-failure tests/i);
  assert.match(plannerRequest.systemInstructions, /positive, negative, and edge cases/i);
  assert.equal(plannerRequest.maxCompletionTokens, 8_192);
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["planning"]);
  assert.deepEqual(harness.stageUpdates.map(({ stage }) => stage), ["planning", "validating"]);
  assert.equal(savedPlan.features.length, 7);
  assert.equal(harness.getSavedPlan()?.features.length, 7);
  assert.equal(harness.wasFailed(), false);
});

void test("missing Tasks fail without fabricated work or a second provider call", async () => {
  const incompletePlan: Record<string, unknown> = { ...createPlan(3) };
  delete incompletePlan.tasks;
  const harness = createGenerationHarness(3, { generateJson: () => Promise.resolve(incompletePlan) });
  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "missing-tasks" });
  const completion = await waitForGeneration(harness);
  assert.equal(completion.kind, "failed");
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("partial mappings are preserved and uncovered criteria fail without blanket mappings", async () => {
  const plan = createPlan(3);
  const partialPlan = { ...plan, stories: plan.stories.map((story) => ({ ...story, acceptanceCriteria: [...story.acceptanceCriteria, "Invalid input leaves stored data unchanged."] })) };
  const harness = createGenerationHarness(3, { generateJson: () => Promise.resolve(partialPlan) });
  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "missing-mapping" });
  const completion = await waitForGeneration(harness);
  assert.equal(completion.kind, "failed");
  assert.match(harness.getFailure()?.message ?? "", /criterion 2 has no implementation task/);
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(partialPlan.tasks[0]?.acceptanceCriteriaIndexes, [1]);
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("accurate partial task mappings survive generation unchanged", async () => {
  const plan = createPlan(3);
  const first = plan.stories[0];
  assert.ok(first);
  const partialPlan = { ...plan, stories: plan.stories.map((story) => story.id === first.id ? { ...story, acceptanceCriteria: [...story.acceptanceCriteria, "Invalid input leaves stored data unchanged."] } : story), tasks: [...plan.tasks, {
    id: "EXTRA-BACKEND", storyId: first.id, title: "Reject invalid requests", description: "Reject invalid values before saving.",
    taskType: "technical_development" as const, layer: "backend" as const, acceptanceCriteriaIndexes: [2], completionCriteria: ["Invalid input returns validation errors and leaves stored data unchanged."], priority: "medium" as const, dependsOn: [], order: 20
  }, {
    id: "EXTRA-TEST", storyId: first.id, title: "Verify rejected requests", description: "Submit invalid input and check unchanged data.",
    taskType: "testing" as const, layer: "testing" as const, acceptanceCriteriaIndexes: [2], completionCriteria: ["Invalid input returns validation errors and leaves stored data unchanged."], priority: "medium" as const, dependsOn: ["EXTRA-BACKEND"], order: 21
  }] };
  const harness = createGenerationHarness(3, { generateJson: () => Promise.resolve(partialPlan) });
  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "partial-mapping" });
  const completion = await waitForGeneration(harness);
  assert.equal(completion.kind, "saved");
  assert.deepEqual(completion.plan.tasks.find(({ id }) => id === "EXTRA-TEST")?.acceptanceCriteriaIndexes, [2]);
  assert.deepEqual(completion.plan.tasks.find(({ id }) => id === "TASK-1")?.acceptanceCriteriaIndexes, [1]);
  assert.equal(completion.plan.tasks.length, partialPlan.tasks.length);
});

void test("missing testing coverage adds a criterion-specific suggestion after one provider call", async () => {
  const plan = createPlan(4);
  const partial = { ...plan, tasks: plan.tasks.filter(({ id }) => id !== "TEST-4") };
  const snapshot = JSON.stringify(partial);
  const harness = createGenerationHarness(4, { generateJson: () => Promise.resolve(partial) });
  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "missing-test-only" });
  const completion = await waitForGeneration(harness);
  assert.equal(completion.kind, "saved");
  assert.equal(harness.requests.length, 1);
  const suggestion = completion.plan.tasks.find(({ id }) => id === "LOCAL-TEST-1");
  assert.ok(suggestion);
  assert.equal(suggestion.storyId, "STORY-4");
  assert.match(suggestion.title, /^Suggested test AC1:/);
  assert.deepEqual(suggestion.acceptanceCriteriaIndexes, [1]);
  assert.deepEqual(suggestion.dependsOn, ["TASK-4"]);
  assert.deepEqual(suggestion.completionCriteria, plan.stories[3]?.acceptanceCriteria);
  assert.equal(suggestion.layer, "testing");
  assert.equal(JSON.stringify(partial), snapshot);
  for (const task of partial.tasks) {
    assert.deepEqual(completion.plan.tasks.find(({ id }) => id === task.id)?.acceptanceCriteriaIndexes, task.acceptanceCriteriaIndexes);
  }
  assert.deepEqual(completeMissingTestCoverage(completion.plan), completion.plan);
});

void test("local testing suggestions avoid existing IDs and preserve selective mappings", () => {
  const plan = createPlan(3);
  const partial = {
    ...plan,
    stories: plan.stories.map((story) => ({ ...story, acceptanceCriteria: ["Valid input is saved.", "Invalid input is rejected without writing data."] })),
    tasks: plan.tasks.map((task) => ({ ...task, id: task.id === "TASK-1" ? "LOCAL-TEST-1" : task.id,
      dependsOn: task.dependsOn.map((id) => id === "TASK-1" ? "LOCAL-TEST-1" : id), acceptanceCriteriaIndexes: task.taskType === "testing" ? [1] : [1, 2] }))
  };
  const completed = completeMissingTestCoverage(partial);
  const added = completed.tasks.slice(partial.tasks.length);
  assert.equal(added.length, 3);
  assert.equal(new Set(completed.tasks.map(({ id }) => id)).size, completed.tasks.length);
  for (const task of added) {
    assert.deepEqual(task.acceptanceCriteriaIndexes, [2]);
    assert.deepEqual(task.completionCriteria, ["Invalid input is rejected without writing data."]);
  }
  assert.deepEqual(completed.tasks.slice(0, partial.tasks.length), partial.tasks);
});

void test("a frontend test does not hide missing backend task testing", () => {
  const plan = createPlan(3);
  const implementation = plan.tasks[0];
  assert.ok(implementation);
  const frontend = { ...implementation, id: "FRONTEND-1", layer: "frontend" as const, dependsOn: [] };
  const input = {
    ...plan,
    tasks: [...plan.tasks.map((task) => task.id === "TEST-1" ? { ...task, dependsOn: [frontend.id] } : task), frontend]
  };
  const completed = completeMissingTestCoverage(input);
  const added = completed.tasks.slice(input.tasks.length);
  assert.equal(added.length, 1);
  assert.deepEqual(added[0]?.dependsOn, ["TASK-1"]);
  assert.deepEqual(added[0].acceptanceCriteriaIndexes, [1]);
  assert.deepEqual(completeMissingTestCoverage(completed), completed);
});

void test("a test can verify development through a transitive integration dependency", () => {
  const plan = createPlan(3);
  const implementation = plan.tasks[0];
  assert.ok(implementation);
  const frontend = { ...implementation, id: "FRONTEND-1", layer: "frontend" as const, dependsOn: [implementation.id] };
  const input = { ...plan, tasks: [...plan.tasks.map((task) => task.id === "TEST-1" ? { ...task, dependsOn: [frontend.id] } : task), frontend] };
  assert.deepEqual(completeMissingTestCoverage(input), input);
});

void test("priority labels are normalized to the supported priority values", async () => {
  const plan = createPlan(3);
  const planWithNonCanonicalPriorities = {
    ...plan,
    features: plan.features.map((feature, index) => ({
      ...feature,
      priority: ["HIGH", "P1", "urgent"][index] ?? "unknown"
    })),
    stories: plan.stories.map((story, index) => ({
      ...story,
      priority: ["P2", "low priority", "not specified"][index] ?? "unknown"
    }))
  };
  const harness = createGenerationHarness(3, {
    generateJson: () => Promise.resolve(planWithNonCanonicalPriorities)
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "priority-normalization" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "saved");
  assert.deepEqual(completion.plan.features.map((feature) => feature.priority), ["high", "high", "critical"]);
  assert.deepEqual(completion.plan.stories.map((story) => story.priority), ["medium", "low", "medium"]);
});

void test("usage is recorded for validation failures without a second provider request", async () => {
  const usage = { inputTokens: 100, outputTokens: 200, totalTokens: 300 };
  const harness = createGenerationHarness(3, { generateJson: (request) => {
    request.onUsage?.(usage);
    return Promise.resolve({ brief: {}, features: [] });
  } });
  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "usage-on-invalid-plan" });
  const completion = await waitForGeneration(harness);
  assert.equal(completion.kind, "failed");
  assert.deepEqual(harness.recordedUsage, [usage]);
  assert.equal(harness.requests.length, 1);
});

void test("transient provider failure is not retried and saves no version", async () => {
  let providerCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: () => {
      providerCalls += 1;
      return Promise.reject(new LlmProviderError("provider_network_error", "Network unavailable.", true));
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "single-provider-attempt" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "failed");
  assert.equal(providerCalls, 1);
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["planning"]);
  assert.equal(harness.getFailure()?.code, "provider_network_error");
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("schema failure is terminal after one provider call", async () => {
  let providerCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: () => {
      providerCalls += 1;
      return Promise.resolve({ brief: {}, features: [], stories: [], tasks: [] });
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "schema-single-attempt" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "failed");
  assert.equal(providerCalls, 1);
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["planning"]);
  assert.equal(harness.getFailure()?.code, "VALIDATION_FAILED");
  assert.equal(harness.getSavedPlan(), undefined);
});

void test("provider rate limit is returned after one attempt and saves no version", async () => {
  let providerCalls = 0;
  const harness = createGenerationHarness(3, {
    generateJson: () => {
      providerCalls += 1;
      return Promise.reject(new LlmProviderError("rate_limit_exceeded", "LLM provider returned HTTP 429.", false));
    }
  });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "provider-rate-limit" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "failed");
  assert.equal(providerCalls, 1);
  assert.equal(harness.getFailure()?.code, "rate_limit_exceeded");
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

void test("cancellation after the single provider response prevents persistence", async () => {
  const harness = createGenerationHarness(3, { cancellationChecks: [false, true] });

  await harness.service.createRun({ projectId, requirement: "Build the requested product with the listed capabilities.", idempotencyKey: "cancel-between-stages" });
  const completion = await waitForGeneration(harness);

  assert.equal(completion.kind, "cancelled");
  assert.deepEqual(harness.requests.map(({ stage }) => stage), ["planning"]);
  assert.equal(completion.result.code, "RUN_CANCELLED");
  assert.equal(harness.getSavedPlan(), undefined);
});
