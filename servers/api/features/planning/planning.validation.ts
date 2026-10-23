import { z } from "zod";

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanValidationError";
  }
}

const idSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const projectInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  context: z.string().trim().max(8_000).default("")
}).strict();

export const projectUpdateInputSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  context: z.string().trim().max(8_000).optional()
}).strict().refine((value) => value.name !== undefined || value.context !== undefined, {
  message: "Provide at least one project field to update."
});

export const projectListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const generatePlanInputSchema = z.object({
  requirement: z.string().trim().min(20).max(12_000),
  instructions: z.string().trim().max(2_000).optional()
}).strict();

export const findSavedRequirementInputSchema = z.object({
  requirement: z.string().trim().min(20).max(12_000),
  context: z.string().trim().max(8_000).default("")
}).strict();

export const versionNumberSchema = z.coerce.number().int().positive();

export const compareVersionsQuerySchema = z.object({
  from: versionNumberSchema,
  to: versionNumberSchema
}).strict();

export const analystResultSchema = z.object({
  goals: z.array(z.string().min(1).max(500)).min(1).max(12),
  requirements: z.array(z.object({
    id: idSchema,
    text: z.string().min(1).max(1_000),
    acceptanceCriteria: z.array(z.string().min(1).max(500)).max(8)
  }).strict()).min(1).max(30),
  constraints: z.array(z.string().min(1).max(500)).max(20),
  assumptions: z.array(z.string().min(1).max(500)).max(20),
  openQuestions: z.array(z.string().min(1).max(500)).max(20)
}).strict();

const featureSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2_000),
  priority: prioritySchema,
  requirementIds: z.array(idSchema).min(1).max(30)
}).strict();
const featuresSchema = z.array(featureSchema).max(30);
const plannerFeaturesSchema = z.array(featureSchema).min(3).max(10);

export const plannerResultSchema = z.object({
  features: plannerFeaturesSchema,
  stories: z.array(z.object({
    id: idSchema,
    featureId: idSchema,
    requirementIds: z.array(idSchema).min(1).max(30),
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(2_000),
    acceptanceCriteria: z.array(z.string().min(1).max(500)).min(1).max(12),
    priority: prioritySchema
  }).strict()).min(1).max(100),
  requirementCoverage: z.array(z.object({
    requirementId: idSchema,
    coverage: z.enum(["addressed", "open", "out_of_scope"]),
    explanation: z.string().max(500).nullable()
  }).strict()).min(1).max(30)
}).strict();

export const taskResultSchema = z.object({
  tasks: z.array(z.object({
    id: idSchema,
    storyId: idSchema,
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(2_000),
    taskType: z.enum(["technical_development", "testing"]),
    completionCriteria: z.array(z.string().min(1).max(500)).min(1).max(12),
    priority: prioritySchema,
    dependsOn: z.array(idSchema).max(100),
    order: z.number().int().nonnegative()
  }).strict()).min(1).max(300)
}).strict();

export const architecturePlanSchema = z.object({
  brief: analystResultSchema.extend({
    requirements: z.array(analystResultSchema.shape.requirements.element.extend({
      coverage: z.enum(["addressed", "open", "out_of_scope"]),
      coverageExplanation: z.string().max(500).nullable()
    })).min(1).max(30)
  }),
  // Version reads must remain compatible with plans saved before the 3-feature rule.
  features: featuresSchema.min(1),
  stories: plannerResultSchema.shape.stories,
  tasks: taskResultSchema.shape.tasks
}).strict();

export const editProjectVersionInputSchema = z.object({
  baseVersion: z.number().int().positive(),
  plan: architecturePlanSchema
}).strict();

export const planningProjectSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.string(),
  context: z.string(),
  currentVersion: z.number().int().positive().nullable(),
  acceptedVersion: z.number().int().positive().nullable()
}).strict();

export const planningRunSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  projectId: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum(["queued", "analyzing", "planning", "decomposing", "grooming", "validating", "succeeded", "failed", "cancelled"]),
  stage: z.enum(["analyzing", "planning", "decomposing", "grooming", "validating"]).nullable(),
  attempts: z.number().int().nonnegative(),
  resultVersion: z.number().int().positive().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).strict().nullable(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable()
}).strict();

const versionValidationSchema = z.object({
  passed: z.boolean(), checks: z.array(z.string()), warnings: z.array(z.string())
}).strict();

export const planningVersionSummarySchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i),
  version: z.number().int().positive(),
  basedOnVersion: z.number().int().positive().nullable(),
  source: z.enum(["generation", "user-edit"]),
  schemaVersion: z.literal(1),
  runId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
  createdAt: z.iso.datetime(),
  validation: versionValidationSchema,
  requirementSummary: z.string().nullable()
}).strict();

export const planningVersionSchema = planningVersionSummarySchema.extend({
  inputSnapshot: z.object({ requirement: z.string(), context: z.string(), instructions: z.string() }).strict().nullable().default(null),
  plan: architecturePlanSchema
}).strict();

const entityChangesSchema = z.object({ added: z.array(z.string()), removed: z.array(z.string()), changed: z.array(z.string()) }).strict();
export const planningVersionComparisonSchema = z.object({
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  changes: z.object({
    features: entityChangesSchema,
    stories: entityChangesSchema,
    tasks: entityChangesSchema,
    requirements: entityChangesSchema
  }).strict()
}).strict();

export const projectResponseSchema = z.object({ project: planningProjectSchema }).strict();
export const projectsResponseSchema = z.object({ projects: z.array(planningProjectSchema) }).strict();
export const runResponseSchema = z.object({ run: planningRunSchema }).strict();
export const runStatusResponseSchema = z.object({ run: planningRunSchema, plan: architecturePlanSchema.nullable() }).strict();
export const versionsResponseSchema = z.object({ versions: z.array(planningVersionSummarySchema) }).strict();
export const versionResponseSchema = z.object({ version: planningVersionSchema }).strict();
export const findSavedRequirementResponseSchema = z.object({
  match: z.object({ project: planningProjectSchema, version: planningVersionSchema }).strict().nullable()
}).strict();
export const comparisonResponseSchema = z.object({ comparison: planningVersionComparisonSchema }).strict();

export type AnalystResult = z.infer<typeof analystResultSchema>;
export type PlannerResult = z.infer<typeof plannerResultSchema>;
export type TaskResult = z.infer<typeof taskResultSchema>;
export type ArchitecturePlanInput = z.infer<typeof architecturePlanSchema>;

export const validateAndOrderPlan = (input: unknown, options: Readonly<{ minimumFeatureCount?: number; maximumFeatureCount?: number }> = {}): ArchitecturePlanInput => {
  const plan = architecturePlanSchema.parse(input);
  const minimumFeatureCount = options.minimumFeatureCount ?? 3;
  const maximumFeatureCount = options.maximumFeatureCount ?? 30;
  if (plan.features.length < minimumFeatureCount) {
    throw new PlanValidationError(`A new plan must contain at least ${String(minimumFeatureCount)} features.`);
  }
  if (plan.features.length > maximumFeatureCount) {
    throw new PlanValidationError(`A new plan must contain no more than ${String(maximumFeatureCount)} features.`);
  }
  const uniqueIds = (values: readonly string[], label: string): void => {
    if (new Set(values).size !== values.length) throw new PlanValidationError(`Duplicate ${label} IDs are not allowed.`);
  };
  uniqueIds(plan.brief.requirements.map(({ id }) => id), "requirement");
  uniqueIds(plan.features.map(({ id }) => id), "feature");
  uniqueIds(plan.stories.map(({ id }) => id), "story");
  uniqueIds(plan.tasks.map(({ id }) => id), "task");

  const requirementIds = new Set(plan.brief.requirements.map(({ id }) => id));
  const featureIds = new Set(plan.features.map(({ id }) => id));
  const storyIds = new Set(plan.stories.map(({ id }) => id));
  const taskIds = new Set(plan.tasks.map(({ id }) => id));
  for (const feature of plan.features) {
    if (feature.requirementIds.some((id) => !requirementIds.has(id))) throw new PlanValidationError(`Feature ${feature.id} references an unknown requirement.`);
  }
  for (const story of plan.stories) {
    if (!featureIds.has(story.featureId)) throw new PlanValidationError(`Story ${story.id} must reference exactly one existing feature.`);
    if (story.requirementIds.some((id) => !requirementIds.has(id))) throw new PlanValidationError(`Story ${story.id} references an unknown requirement.`);
  }
  for (const requirement of plan.brief.requirements) {
    const linked = plan.features.some(({ requirementIds: ids }) => ids.includes(requirement.id))
      || plan.stories.some(({ requirementIds: ids }) => ids.includes(requirement.id));
    if (requirement.coverage === "addressed" && !linked) throw new PlanValidationError(`Requirement ${requirement.id} is marked addressed but has no linked feature or story.`);
    if (requirement.coverage !== "addressed" && !requirement.coverageExplanation?.trim()) throw new PlanValidationError(`Requirement ${requirement.id} needs an explanation for ${requirement.coverage} coverage.`);
  }
  for (const story of plan.stories) {
    if (!story.requirementIds.length) throw new PlanValidationError(`Story ${story.id} must reference at least one requirement.`);
    if (!plan.features.some(({ id }) => id === story.featureId)) throw new PlanValidationError(`Story ${story.id} has no parent feature.`);
  }
  for (const feature of plan.features) {
    if (!plan.stories.some(({ featureId }) => featureId === feature.id)) throw new PlanValidationError(`Feature ${feature.id} has no user stories.`);
  }
  for (const task of plan.tasks) {
    if (!storyIds.has(task.storyId)) throw new PlanValidationError(`Task ${task.id} references an unknown story.`);
    if (new Set(task.dependsOn).size !== task.dependsOn.length) throw new PlanValidationError(`Task ${task.id} has duplicate dependencies.`);
    if (task.dependsOn.includes(task.id)) throw new PlanValidationError(`Task ${task.id} cannot depend on itself.`);
    if (task.dependsOn.some((id) => !taskIds.has(id))) throw new PlanValidationError(`Task ${task.id} references an unknown dependency.`);
  }
  for (const story of plan.stories) {
    if (!plan.tasks.some(({ storyId }) => storyId === story.id)) throw new PlanValidationError(`Story ${story.id} has no implementation tasks.`);
  }

  const remaining = new Map(plan.tasks.map((task) => [task.id, new Set(task.dependsOn)]));
  const orderedIds: string[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining.entries()].filter(([, dependencies]) => dependencies.size === 0).map(([id]) => id).sort((left, right) => left.localeCompare(right));
    if (ready.length === 0) throw new PlanValidationError("Task dependencies contain a cycle.");
    for (const id of ready) {
      orderedIds.push(id);
      remaining.delete(id);
      for (const dependencies of remaining.values()) dependencies.delete(id);
    }
  }
  const tasksById = new Map(plan.tasks.map((task) => [task.id, task]));
  const tasks = orderedIds.map((id, index) => {
    const task = tasksById.get(id);
    if (!task) throw new PlanValidationError(`Task ${id} disappeared while calculating order.`);
    return { ...task, order: index + 1 };
  });
  return Object.freeze({ ...plan, tasks });
};
