import { createHash } from "node:crypto";
import { Types, startSession } from "mongoose";
import type { ArchitecturePlan } from "@workspace/types";
import { ArchitectureVersionModel, GenerationRunModel, ProjectModel, type VersionInputSnapshot } from "./planning.models.js";

type WorkerRun = Readonly<{
  id: string;
  projectId: string;
  requirement: string;
  instructions: string;
  contextSnapshot: string;
  baseVersion: number | null;
}>;

const toProject = (record: { _id: Types.ObjectId; name: string; context: string; currentVersion: number | null; acceptedVersion: number | null }) => ({
  id: record._id.toString(), name: record.name, context: record.context,
  currentVersion: record.currentVersion, acceptedVersion: record.acceptedVersion
});

type RunViewRecord = Readonly<{
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  status: string;
  stage: string | null;
  attempts: number;
  resultVersion: number | null;
  error: { code: string; message: string } | null;
  createdAt: Date;
  finishedAt: Date | null;
}>;

type VersionViewRecord = Readonly<{
  projectId: Types.ObjectId;
  version: number;
  basedOnVersion: number | null;
  source: "generation" | "user-edit";
  schemaVersion: number;
  runId: Types.ObjectId | null;
  inputSnapshot: VersionInputSnapshot | null;
  plan: ArchitecturePlan;
  validation: { passed: boolean; checks: string[]; warnings: string[] };
  createdAt: Date;
}>;

const toRun = (record: RunViewRecord) => ({
  id: record._id.toString(), projectId: record.projectId.toString(), status: record.status,
  stage: typeof record.stage === "string" ? record.stage : null,
  attempts: record.attempts, resultVersion: typeof record.resultVersion === "number" ? record.resultVersion : null,
  error: record.error && typeof record.error === "object"
    ? { code: record.error.code, message: record.error.message }
    : null,
  createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date().toISOString(),
  finishedAt: record.finishedAt instanceof Date ? record.finishedAt.toISOString() : null
});

const toVersion = (record: VersionViewRecord) => ({
  projectId: record.projectId.toString(), version: record.version, basedOnVersion: record.basedOnVersion,
  source: record.source, schemaVersion: 1 as const, runId: record.runId?.toString() ?? null,
  inputSnapshot: record.inputSnapshot, plan: record.plan, validation: record.validation,
  requirementSummary: record.inputSnapshot?.requirement ?? null,
  createdAt: record.createdAt.toISOString()
});

const toVersionSummary = (record: VersionViewRecord) => ({
  projectId: record.projectId.toString(), version: record.version, basedOnVersion: record.basedOnVersion,
  source: record.source, schemaVersion: 1 as const, runId: record.runId?.toString() ?? null,
  createdAt: record.createdAt.toISOString(), validation: record.validation,
  requirementSummary: record.inputSnapshot?.requirement ?? null
});

const fingerprint = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const createPlanningRepository = () => ({
  createOrUpdateProject: async (input: { name: string; context: string }) => {
    const normalizedName = input.name.trim().toLowerCase().replace(/\s+/g, " ");
    const project = await ProjectModel.findOneAndUpdate(
      { normalizedName },
      { $set: { name: input.name.trim(), context: input.context }, $setOnInsert: { normalizedName, currentVersion: null, acceptedVersion: null } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).lean().exec();
    return toProject(project);
  },

  listProjects: async (limit: number) => (await ProjectModel.find({}).sort({ updatedAt: -1, _id: -1 }).limit(limit).lean().exec()).map(toProject),

  getProject: async (projectId: string) => {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const project = await ProjectModel.findById(projectId).lean().exec();
    return project ? toProject(project) : null;
  },

  updateProject: async (projectId: string, input: { name?: string; context?: string }) => {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const update: { name?: string; normalizedName?: string; context?: string } = {};
    if (input.name !== undefined) {
      update.name = input.name.trim();
      update.normalizedName = input.name.trim().toLowerCase().replace(/\s+/g, " ");
    }
    if (input.context !== undefined) update.context = input.context;
    const project = await ProjectModel.findByIdAndUpdate(projectId, { $set: update }, { returnDocument: "after", runValidators: true }).lean().exec();
    return project ? toProject(project) : null;
  },

  createRun: async (input: {
    projectId: string; requirement: string; instructions: string; idempotencyKey: string;
    provider: string; model: string; promptVersion: string;
  }) => {
    const projectObjectId = new Types.ObjectId(input.projectId);
    const requestFingerprint = fingerprint({ requirement: input.requirement, instructions: input.instructions });
    const existing = await GenerationRunModel.findOne({ projectId: projectObjectId, idempotencyKey: input.idempotencyKey }).lean().exec();
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) return { conflict: true as const };
      return { conflict: false as const, created: false, run: toRun(existing) };
    }
    const project = await ProjectModel.findById(projectObjectId).lean().exec();
    if (!project) return { missingProject: true as const };
    try {
      const run = await GenerationRunModel.create({
        projectId: projectObjectId, status: "queued", stage: null, requirement: input.requirement,
        instructions: input.instructions, contextSnapshot: project.context, baseVersion: project.currentVersion,
        provider: input.provider, model: input.model, promptVersion: input.promptVersion,
        attempts: 0, stageAttempts: {}, idempotencyKey: input.idempotencyKey, requestFingerprint,
        resultVersion: null, error: null, startedAt: null, finishedAt: null
      });
      return { conflict: false as const, created: true, run: toRun(run.toObject()) };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
        const duplicate = await GenerationRunModel.findOne({ projectId: projectObjectId, idempotencyKey: input.idempotencyKey }).lean().exec();
        if (duplicate?.requestFingerprint === requestFingerprint) {
          return { conflict: false as const, created: false, run: toRun(duplicate) };
        }
        return { conflict: true as const };
      }
      throw error;
    }
  },

  getRun: async (runId: string) => {
    if (!Types.ObjectId.isValid(runId)) return null;
    const record = await GenerationRunModel.findById(runId).lean().exec();
    if (!record) return null;
    const plan = typeof record.resultVersion === "number"
      ? await ArchitectureVersionModel.findOne({ projectId: record.projectId, version: record.resultVersion }).lean().exec()
      : null;
    return { run: toRun(record), plan: plan?.plan ?? null };
  },

  cancelRun: async (runId: string) => {
    if (!Types.ObjectId.isValid(runId)) return null;
    const now = new Date();
    const updated = await GenerationRunModel.findOneAndUpdate(
      { _id: runId, status: { $in: ["queued", "analyzing", "planning", "decomposing", "grooming", "validating"] } },
      { $set: { status: "cancelled", error: { code: "RUN_CANCELLED", message: "Generation was cancelled by the user.", retryable: false }, finishedAt: now } },
      { returnDocument: "after" }
    ).lean().exec();
    if (updated) return { kind: "cancelled" as const, run: toRun(updated) };
    const existing = await GenerationRunModel.findById(runId).lean().exec();
    return existing ? { kind: "terminal" as const, run: toRun(existing) } : null;
  },

  isRunCancelled: async (runId: string) => {
    if (!Types.ObjectId.isValid(runId)) return true;
    const run = await GenerationRunModel.findById(runId).select({ status: 1 }).lean().exec();
    return !run || run.status === "cancelled";
  },

  listVersions: async (projectId: string) => {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const session = await startSession();
    try {
      const projectExists = await session.withTransaction(async () => {
        const project = await ProjectModel.findById(projectId).session(session).exec();
        if (!project) return false;
        const versions = await ArchitectureVersionModel.find({ projectId }).sort({ version: 1 }).session(session).lean().exec();
        const needsCompaction = versions.some((record, index) => record.version !== index + 1);
        if (!needsCompaction) return true;

        const versionMap = new Map(versions.map((record, index) => [record.version, index + 1]));
        const remap = (oldVersion: number | null): number | null => {
          if (oldVersion === null) return null;
          const exact = versionMap.get(oldVersion);
          if (exact !== undefined) return exact;
          const predecessor = versions.filter((record) => record.version < oldVersion).at(-1);
          return predecessor ? versionMap.get(predecessor.version) ?? null : null;
        };

        await ArchitectureVersionModel.updateMany({ projectId }, { $mul: { version: -1 } }, { session }).exec();
        for (const [index, record] of versions.entries()) {
          await ArchitectureVersionModel.updateOne(
            { _id: record._id, projectId },
            { $set: { version: index + 1, basedOnVersion: remap(record.basedOnVersion) } },
            { session }
          ).exec();
        }
        const runs = await GenerationRunModel.find({ projectId }).select({ _id: 1, resultVersion: 1 }).session(session).lean().exec();
        await GenerationRunModel.updateMany({ projectId }, { $set: { resultVersion: null } }, { session }).exec();
        for (const run of runs) {
          if (run.resultVersion === null) continue;
          const resultVersion = versionMap.get(run.resultVersion);
          if (resultVersion !== undefined) await GenerationRunModel.updateOne({ _id: run._id }, { $set: { resultVersion } }, { session }).exec();
        }
        project.currentVersion = remap(project.currentVersion);
        project.acceptedVersion = remap(project.acceptedVersion);
        await project.save({ session });
        return true;
      });
      if (!projectExists) return null;
      const versions = await ArchitectureVersionModel.find({ projectId }).sort({ version: -1 }).lean().exec();
      return versions.map((version) => toVersionSummary(version));
    } finally {
      await session.endSession();
    }
  },

  deleteVersion: async (projectId: string, version: number) => {
    if (!Types.ObjectId.isValid(projectId)) return "project-not-found" as const;
    const session = await startSession();
    try {
      const result = await session.withTransaction(async () => {
        const project = await ProjectModel.findById(projectId).session(session).exec();
        if (!project) return "project-not-found" as const;
        const existing = await ArchitectureVersionModel.find({ projectId }).sort({ version: 1 }).session(session).lean().exec();
        const removed = existing.find((record) => record.version === version);
        if (!removed) return "version-not-found" as const;
        await ArchitectureVersionModel.deleteOne({ projectId, version }, { session }).exec();

        const retained = existing.filter((record) => record.version !== version);
        const versionMap = new Map(retained.map((record, index) => [record.version, index + 1]));
        const previousVersionFor = (oldVersion: number | null): number | null => {
          if (oldVersion === null) return null;
          const exact = versionMap.get(oldVersion);
          if (exact !== undefined) return exact;
          const previous = retained.filter((record) => record.version < oldVersion).at(-1);
          return previous ? versionMap.get(previous.version) ?? null : null;
        };

        // Move surviving unique-index values out of the positive range before compacting.
        await ArchitectureVersionModel.updateMany(
          { projectId, version: { $ne: version } },
          { $mul: { version: -1 } },
          { session }
        ).exec();
        for (const [index, record] of retained.entries()) {
          await ArchitectureVersionModel.updateOne(
            { _id: record._id, projectId },
            { $set: { version: index + 1, basedOnVersion: previousVersionFor(record.basedOnVersion) } },
            { session }
          ).exec();
        }

        await GenerationRunModel.updateMany({ projectId }, { $set: { resultVersion: null } }, { session }).exec();
        for (const [index, record] of retained.entries()) {
          if (record.runId) await GenerationRunModel.updateOne({ _id: record.runId, projectId }, { $set: { resultVersion: index + 1 } }, { session }).exec();
        }

        project.currentVersion = retained.length > 0 ? retained.length : null;
        project.acceptedVersion = project.acceptedVersion === version ? null : previousVersionFor(project.acceptedVersion);
        await project.save({ session });
        return "deleted" as const;
      });
      return result;
    } finally {
      await session.endSession();
    }
  },

  findSavedRequirement: async (input: { requirement: string; context: string }) => {
    const record = await ArchitectureVersionModel.findOne({
      "inputSnapshot.requirement": input.requirement.trim(),
      "inputSnapshot.context": input.context.trim()
    }).sort({ createdAt: -1, version: -1 }).lean().exec();
    if (!record) return null;
    const project = await ProjectModel.findById(record.projectId).lean().exec();
    return project ? { project: toProject(project), version: toVersion(record) } : null;
  },

  getVersion: async (projectId: string, version: number) => {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const record = await ArchitectureVersionModel.findOne({ projectId, version }).lean().exec();
    return record ? toVersion(record) : null;
  },

  saveEditedVersion: async (projectId: string, baseVersion: number, plan: ArchitecturePlan) => {
    if (!Types.ObjectId.isValid(projectId)) return { kind: "project-not-found" as const };
    const projectObjectId = new Types.ObjectId(projectId);
    const session = await startSession();
    try {
      const result = await session.withTransaction(async () => {
        const project = await ProjectModel.findById(projectObjectId).session(session).exec();
        if (!project) return { kind: "project-not-found" as const };
        if (project.currentVersion !== baseVersion) return { kind: "conflict" as const };
        const base = await ArchitectureVersionModel.findOne({ projectId: projectObjectId, version: baseVersion }).session(session).lean().exec();
        if (!base) return { kind: "version-not-found" as const };
        const nextVersion = baseVersion + 1;
        const [saved] = await ArchitectureVersionModel.create([{
          projectId: projectObjectId, version: nextVersion, basedOnVersion: baseVersion, source: "user-edit",
          schemaVersion: 1, runId: null, inputSnapshot: base.inputSnapshot, plan,
          validation: { passed: true, checks: ["schema", "coverage", "relationships", "dependency-graph", "task-order"], warnings: [] }
        }], { session });
        if (!saved) throw new Error("Edited version insert returned no record.");
        project.currentVersion = nextVersion;
        await project.save({ session });
        return { kind: "saved" as const, version: toVersion(saved.toObject()) };
      });
      return result;
    } finally {
      await session.endSession();
    }
  },

  acceptVersion: async (projectId: string, version: number) => {
    if (!Types.ObjectId.isValid(projectId)) return null;
    const projectObjectId = new Types.ObjectId(projectId);
    const exists = await ArchitectureVersionModel.exists({ projectId: projectObjectId, version });
    if (!exists) return null;
    const project = await ProjectModel.findByIdAndUpdate(projectObjectId, { $set: { acceptedVersion: version } }, { returnDocument: "after" }).lean().exec();
    return project ? toProject(project) : null;
  },

  hasProject: async (projectId: string) => Types.ObjectId.isValid(projectId) && Boolean(await ProjectModel.exists({ _id: projectId })),

  claimRun: async (runId: string): Promise<Readonly<{ id: string; projectId: string }> | null> => {
    if (!Types.ObjectId.isValid(runId)) return null;
    const claimed = await GenerationRunModel.findOneAndUpdate(
      { _id: runId, status: "queued" },
      { $set: { status: "analyzing", stage: "analyzing", startedAt: new Date() } },
      { returnDocument: "after" }
    ).lean().exec();
    return claimed ? { id: claimed._id.toString(), projectId: claimed.projectId.toString() } : null;
  },

  getRunForWorker: async (runId: string): Promise<WorkerRun | null> => {
    if (!Types.ObjectId.isValid(runId)) return null;
    const run = await GenerationRunModel.findById(runId).lean().exec();
    return run ? {
      id: run._id.toString(), projectId: run.projectId.toString(), requirement: run.requirement,
      instructions: run.instructions, contextSnapshot: run.contextSnapshot, baseVersion: run.baseVersion
    } : null;
  },

  updateStage: async (runId: string, stage: string, attempt: number) => GenerationRunModel.updateOne(
    { _id: runId, status: { $nin: ["failed", "cancelled", "succeeded"] } },
    { $set: { stage, status: stage, [`stageAttempts.${stage}`]: attempt }, $inc: { attempts: 1 } }
  ).exec(),

  failRun: async (runId: string, code: string, message: string, retryable: boolean) => GenerationRunModel.updateOne(
    { _id: runId, status: { $nin: ["succeeded", "cancelled"] } },
    { $set: { status: "failed", error: { code, message, retryable }, finishedAt: new Date() } }
  ).exec(),

  savePlan: async (runId: string, projectId: string, baseVersion: number | null, plan: ArchitecturePlan): Promise<number | null> => {
    const runObjectId = new Types.ObjectId(runId);
    const projectObjectId = new Types.ObjectId(projectId);
    const session = await startSession();
    let committedVersion: number | null = null;
    try {
      await session.withTransaction(async () => {
        const project = await ProjectModel.findById(projectObjectId).session(session).exec();
        if (!project) throw new Error("PROJECT_NOT_FOUND");
        if (project.currentVersion !== baseVersion) throw new Error("VERSION_CONFLICT");
        const run = await GenerationRunModel.findById(runObjectId).session(session).exec();
        if (!run) throw new Error("RUN_NOT_FOUND");
        const version = (project.currentVersion ?? 0) + 1;
        await ArchitectureVersionModel.create([{
          projectId: projectObjectId, version, basedOnVersion: baseVersion, source: "generation", schemaVersion: 1,
          runId: runObjectId, inputSnapshot: { requirement: run.requirement, context: run.contextSnapshot, instructions: run.instructions }, plan,
          validation: { passed: true, checks: ["schema", "coverage", "relationships", "dependency-graph", "task-order"], warnings: [] }
        }], { session });
        const update = await GenerationRunModel.updateOne(
          { _id: runObjectId, status: { $nin: ["cancelled", "failed"] } },
          { $set: { status: "succeeded", stage: null, resultVersion: version, error: null, finishedAt: new Date() } },
          { session }
        ).exec();
        if (update.modifiedCount !== 1) throw new Error("RUN_CANCELLED");
        project.currentVersion = version;
        await project.save({ session });
        committedVersion = version;
      });
    } finally {
      await session.endSession();
    }
    return committedVersion;
  },

  markActiveRunsInterrupted: async () => GenerationRunModel.updateMany(
    { status: { $in: ["analyzing", "planning", "decomposing", "grooming", "validating"] } },
    { $set: { status: "failed", error: { code: "RUN_INTERRUPTED", message: "The API restarted while this run was active.", retryable: true }, finishedAt: new Date() } }
  ).exec(),

  listQueuedRuns: async () => (await GenerationRunModel.find({ status: "queued" }).select({ _id: 1 }).lean().exec()).map(({ _id }) => _id.toString()),
  isValidProjectId: (value: string) => Types.ObjectId.isValid(value)
});
