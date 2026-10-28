export type PlanRequirement = Readonly<{
  id: string;
  text: string;
  acceptanceCriteria: readonly string[];
  coverage: "addressed" | "open" | "out_of_scope";
  coverageExplanation: string | null;
}>;

export type PlanFeature = Readonly<{
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  requirementIds: readonly string[];
}>;

export type PlanStory = Readonly<{
  id: string;
  featureId: string;
  requirementIds: readonly string[];
  title: string;
  description: string;
  acceptanceCriteria: readonly string[];
  priority: "low" | "medium" | "high" | "critical";
}>;

export type PlanTask = Readonly<{
  id: string;
  storyId: string;
  title: string;
  description: string;
  taskType: "technical_development" | "testing" | "design" | "infrastructure" | "documentation";
  acceptanceCriteriaIndexes?: readonly number[] | undefined;
  layer?: "backend" | "frontend" | "data" | "integration" | "testing" | "design" | "infrastructure" | "documentation" | undefined;
  completionCriteria: readonly string[];
  priority: "low" | "medium" | "high" | "critical";
  dependsOn: readonly string[];
  order: number;
}>;

export type ArchitecturePlan = Readonly<{
  brief: Readonly<{
    goals: readonly string[];
    requirements: readonly PlanRequirement[];
    constraints: readonly string[];
    assumptions: readonly string[];
    openQuestions: readonly string[];
    outOfScope?: readonly string[] | undefined;
  }>;
  features: readonly PlanFeature[];
  stories: readonly PlanStory[];
  tasks: readonly PlanTask[];
}>;

export type PlanningProject = Readonly<{
  id: string;
  name: string;
  context: string;
  currentVersion: number | null;
  acceptedVersion: number | null;
}>;

export type PlanningTokenUsage = Readonly<{
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}>;

export type PlanningRun = Readonly<{
  id: string;
  projectId: string;
  status: "queued" | "analyzing" | "planning" | "decomposing" | "grooming" | "validating" | "succeeded" | "failed" | "cancelled";
  stage: string | null;
  attempts: number;
  resultVersion: number | null;
  error: Readonly<{ code: string; message: string }> | null;
  createdAt: string;
  finishedAt: string | null;
  usage?: PlanningTokenUsage | null | undefined;
}>;

export type PlanningVersionSummary = Readonly<{
  projectId: string;
  version: number;
  basedOnVersion: number | null;
  source: "generation" | "user-edit";
  schemaVersion: 1;
  runId: string | null;
  createdAt: string;
  validation: Readonly<{ passed: boolean; checks: readonly string[]; warnings: readonly string[] }>;
  requirementSummary: string | null;
}>;

export type PlanningVersion = PlanningVersionSummary & Readonly<{
  inputSnapshot: Readonly<{ requirement: string; context: string; instructions: string }> | null;
  plan: ArchitecturePlan;
  usage?: PlanningTokenUsage | null | undefined;
}>;

export type VersionEntityChanges = Readonly<{
  added: readonly string[];
  removed: readonly string[];
  changed: readonly string[];
}>;

export type PlanningVersionComparison = Readonly<{
  fromVersion: number;
  toVersion: number;
  changes: Readonly<{
    features: VersionEntityChanges;
    stories: VersionEntityChanges;
    tasks: VersionEntityChanges;
    requirements: VersionEntityChanges;
  }>;
}>;

export type ProjectInput = Readonly<{ name: string; context: string }>;
export type ProjectUpdateInput = Readonly<{ name?: string; context?: string }>;
export type GeneratePlanInput = Readonly<{ requirement: string; instructions?: string }>;
export type FindSavedRequirementInput = Readonly<{ requirement: string; context?: string }>;
export type EditPlanInput = Readonly<{ baseVersion: number; plan: ArchitecturePlan }>;
export type CreateProjectResponse = Readonly<{ project: PlanningProject }>;
export type ListProjectsResponse = Readonly<{ projects: readonly PlanningProject[] }>;
export type GetProjectResponse = CreateProjectResponse;
export type UpdateProjectResponse = CreateProjectResponse;
export type CreateRunResponse = Readonly<{ run: PlanningRun }>;
export type GetRunResponse = Readonly<{ run: PlanningRun; plan: ArchitecturePlan | null }>;
export type CancelRunResponse = CreateRunResponse;
export type ListProjectVersionsResponse = Readonly<{ versions: readonly PlanningVersionSummary[] }>;
export type GetProjectVersionResponse = Readonly<{ version: PlanningVersion }>;
export type FindSavedRequirementResponse = Readonly<{
  match: Readonly<{ project: PlanningProject; version: PlanningVersion }> | null;
}>;
export type EditProjectVersionResponse = GetProjectVersionResponse;
export type AcceptProjectVersionResponse = CreateProjectResponse;
export type CompareProjectVersionsResponse = Readonly<{ comparison: PlanningVersionComparison }>;
