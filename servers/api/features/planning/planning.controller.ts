import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ERROR_CODES, HTTP_STATUS } from "../../constants/index.js";
import { createApplicationError } from "../../errors/index.js";
import type { PlanningHttpService } from "./planning.service.js";
import {
  compareVersionsQuerySchema,
  editProjectVersionInputSchema,
  findSavedRequirementInputSchema,
  findSavedRequirementResponseSchema,
  generatePlanInputSchema,
  projectInputSchema,
  projectListQuerySchema,
  projectResponseSchema,
  projectsResponseSchema,
  projectUpdateInputSchema,
  runResponseSchema,
  runStatusResponseSchema,
  versionResponseSchema,
  versionsResponseSchema,
  comparisonResponseSchema,
  versionNumberSchema
} from "./planning.validation.js";

type PlanningControllerDependencies = Readonly<{ service: PlanningHttpService }>;
type PlanningController = Readonly<{
  createProject: RequestHandler;
  listProjects: RequestHandler;
  getProject: RequestHandler;
  updateProject: RequestHandler;
  createRun: RequestHandler;
  getRun: RequestHandler;
  cancelRun: RequestHandler;
  listVersions: RequestHandler;
  deleteVersion: RequestHandler;
  findSavedRequirement: RequestHandler;
  getVersion: RequestHandler;
  editVersion: RequestHandler;
  acceptVersion: RequestHandler;
  compareVersions: RequestHandler;
}>;

const parseResponse = <T>(schema: ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw createApplicationError({
    code: ERROR_CODES.internal,
    message: "API response contract validation failed.",
    status: HTTP_STATUS.internalServerError
  });
  return parsed.data;
};

const requireParam = (value: string | readonly string[] | undefined, name: string): string => {
  const normalized: string | undefined = typeof value === "string" ? value : value?.[0];
  if (!normalized) throw createApplicationError({ code: ERROR_CODES.validation, message: `Missing ${name}.`, status: HTTP_STATUS.badRequest });
  return normalized;
};

export const createPlanningController = ({ service }: PlanningControllerDependencies): PlanningController => Object.freeze({
  createProject: (async (request, response) => {
    const input = projectInputSchema.parse(request.body);
    const project = await service.createProject(input);
    response.status(HTTP_STATUS.created).json(parseResponse(projectResponseSchema, { project }));
  }) satisfies RequestHandler,

  listProjects: (async (request, response) => {
    const { limit } = projectListQuerySchema.parse(request.query);
    const projects = await service.listProjects(limit);
    response.status(HTTP_STATUS.ok).json(parseResponse(projectsResponseSchema, { projects }));
  }) satisfies RequestHandler,

  getProject: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const project = await service.getProject(projectId);
    response.status(HTTP_STATUS.ok).json(parseResponse(projectResponseSchema, { project }));
  }) satisfies RequestHandler,

  updateProject: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const input = projectUpdateInputSchema.parse(request.body);
    const project = await service.updateProject(projectId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.context !== undefined ? { context: input.context } : {})
    });
    response.status(HTTP_STATUS.ok).json(parseResponse(projectResponseSchema, { project }));
  }) satisfies RequestHandler,

  createRun: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const idempotencyKey = request.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw createApplicationError({ code: ERROR_CODES.validation, message: "Provide an Idempotency-Key header no longer than 128 characters.", status: HTTP_STATUS.badRequest });
    }
    const input = generatePlanInputSchema.parse(request.body);
    const run = await service.createRun({ projectId, requirement: input.requirement, instructions: input.instructions ?? "", idempotencyKey });
    response.status(HTTP_STATUS.accepted).json(parseResponse(runResponseSchema, { run }));
  }) satisfies RequestHandler,

  getRun: (async (request, response) => {
    const runId = requireParam(request.params.runId, "runId");
    const result = await service.getRun(runId);
    response.status(HTTP_STATUS.ok).json(parseResponse(runStatusResponseSchema, result));
  }) satisfies RequestHandler,

  cancelRun: (async (request, response) => {
    const runId = requireParam(request.params.runId, "runId");
    const run = await service.cancelRun(runId);
    response.status(HTTP_STATUS.accepted).json(parseResponse(runResponseSchema, { run }));
  }) satisfies RequestHandler,

  listVersions: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const versions = await service.listVersions(projectId);
    response.status(HTTP_STATUS.ok).json(parseResponse(versionsResponseSchema, { versions }));
  }) satisfies RequestHandler,

  deleteVersion: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const versionNumber = versionNumberSchema.parse(request.params.version);
    await service.deleteVersion(projectId, versionNumber);
    response.sendStatus(HTTP_STATUS.noContent);
  }) satisfies RequestHandler,

  findSavedRequirement: (async (request, response) => {
    const input = findSavedRequirementInputSchema.parse(request.body);
    const match = await service.findSavedRequirement(input);
    response.status(HTTP_STATUS.ok).json(parseResponse(findSavedRequirementResponseSchema, { match }));
  }) satisfies RequestHandler,

  getVersion: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const versionNumber = versionNumberSchema.parse(request.params.version);
    const version = await service.getVersion(projectId, versionNumber);
    response.status(HTTP_STATUS.ok).json(parseResponse(versionResponseSchema, { version }));
  }) satisfies RequestHandler,

  editVersion: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const input = editProjectVersionInputSchema.parse(request.body);
    const version = await service.editVersion(projectId, input.baseVersion, input.plan);
    response.status(HTTP_STATUS.created).json(parseResponse(versionResponseSchema, { version }));
  }) satisfies RequestHandler,

  acceptVersion: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const versionNumber = versionNumberSchema.parse(request.params.version);
    const project = await service.acceptVersion(projectId, versionNumber);
    response.status(HTTP_STATUS.ok).json(parseResponse(projectResponseSchema, { project }));
  }) satisfies RequestHandler,

  compareVersions: (async (request, response) => {
    const projectId = requireParam(request.params.projectId, "projectId");
    const { from, to } = compareVersionsQuerySchema.parse(request.query);
    const comparison = await service.compareVersions(projectId, from, to);
    response.status(HTTP_STATUS.ok).json(parseResponse(comparisonResponseSchema, { comparison }));
  }) satisfies RequestHandler
});
