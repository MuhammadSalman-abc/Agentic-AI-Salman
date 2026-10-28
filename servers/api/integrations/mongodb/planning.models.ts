import type { Types} from "mongoose";
import mongoose, { model, Schema, type Model } from "mongoose";
import type { ArchitecturePlan, PlanningTokenUsage } from "@workspace/types";

export type ProjectRecord = {
  name: string;
  normalizedName: string;
  context: string;
  currentVersion: number | null;
  acceptedVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RunStatus = "queued" | "analyzing" | "planning" | "decomposing" | "grooming" | "validating" | "succeeded" | "failed" | "cancelled";
export type RunStage = Exclude<RunStatus, "queued" | "succeeded" | "failed" | "cancelled">;
export type VersionInputSnapshot = Readonly<{ requirement: string; context: string; instructions: string }>;

export type GenerationRunRecord = Readonly<{
  projectId: Types.ObjectId;
  status: RunStatus;
  active?: boolean;
  stage: RunStage | null;
  requirement: string;
  instructions: string;
  contextSnapshot: string;
  baseVersion: number | null;
  provider: string;
  model: string;
  promptVersion: string;
  attempts: number;
  stageAttempts: Record<string, number>;
  idempotencyKey: string;
  requestFingerprint: string;
  resultVersion: number | null;
  usage: PlanningTokenUsage | null;
  error: { code: string; message: string; retryable: boolean } | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}>;

export type ArchitectureVersionRecord = Readonly<{
  projectId: Types.ObjectId;
  version: number;
  basedOnVersion: number | null;
  source: "generation" | "user-edit";
  schemaVersion: number;
  runId: Types.ObjectId | null;
  inputSnapshot: VersionInputSnapshot | null;
  plan: ArchitecturePlan;
  usage: PlanningTokenUsage | null;
  validation: { passed: boolean; checks: string[]; warnings: string[] };
  createdAt: Date;
}>;

const projectSchema = new Schema<ProjectRecord>({
  name: { type: String, required: true },
  normalizedName: { type: String, required: true, unique: true },
  context: { type: String, default: "" },
  currentVersion: { type: Number, default: null },
  acceptedVersion: { type: Number, default: null }
}, { timestamps: true });

const generationRunSchema = new Schema<GenerationRunRecord>({
  active: { type: Boolean, default: false },
  projectId: { type: Schema.Types.ObjectId, required: true, index: true },
  status: { type: String, required: true, enum: ["queued", "analyzing", "planning", "decomposing", "grooming", "validating", "succeeded", "failed", "cancelled"], index: true },
  stage: { type: String, enum: ["analyzing", "planning", "decomposing", "grooming", "validating"], default: null },
  requirement: { type: String, required: true },
  instructions: { type: String, default: "" },
  contextSnapshot: { type: String, default: "" },
  baseVersion: { type: Number, default: null },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  promptVersion: { type: String, required: true },
  attempts: { type: Number, required: true, default: 0 },
  stageAttempts: { type: Schema.Types.Mixed, required: true, default: {} },
  idempotencyKey: { type: String, required: true },
  requestFingerprint: { type: String, required: true },
  resultVersion: { type: Number, default: null },
  usage: { type: Schema.Types.Mixed, default: null },
  error: { type: Schema.Types.Mixed, default: null },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });
generationRunSchema.index({ projectId: 1, idempotencyKey: 1 }, { unique: true });
generationRunSchema.index({ projectId: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });
generationRunSchema.index({ projectId: 1, createdAt: -1 });

const architectureVersionSchema = new Schema<ArchitectureVersionRecord>({
  projectId: { type: Schema.Types.ObjectId, required: true },
  version: { type: Number, required: true },
  basedOnVersion: { type: Number, default: null },
  source: { type: String, required: true, enum: ["generation", "user-edit"] },
  schemaVersion: { type: Number, required: true, enum: [1] },
  runId: { type: Schema.Types.ObjectId, default: null },
  inputSnapshot: { type: Schema.Types.Mixed, default: null },
  plan: { type: Schema.Types.Mixed, required: true },
  usage: { type: Schema.Types.Mixed, default: null },
  validation: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });
architectureVersionSchema.index({ projectId: 1, version: 1 }, { unique: true });

export const ProjectModel: Model<ProjectRecord> = (mongoose.models.PlanningProject as Model<ProjectRecord> | undefined)
  ?? model<ProjectRecord>("PlanningProject", projectSchema);
export const GenerationRunModel: Model<GenerationRunRecord> = (mongoose.models.GenerationRun as Model<GenerationRunRecord> | undefined)
  ?? model<GenerationRunRecord>("GenerationRun", generationRunSchema);
export const ArchitectureVersionModel: Model<ArchitectureVersionRecord> = (mongoose.models.ArchitectureVersion as Model<ArchitectureVersionRecord> | undefined)
  ?? model<ArchitectureVersionRecord>("ArchitectureVersion", architectureVersionSchema);
