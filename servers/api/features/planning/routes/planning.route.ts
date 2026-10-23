import { Router } from "express";
import type { PlanningHttpService } from "../planning.service.js";
import { createPlanningController } from "../planning.controller.js";

export const createPlanningRoutes = (service: PlanningHttpService): Router => {
  const router = Router();
  const controller = createPlanningController({ service });
  router.post("/api/projects", controller.createProject);
  router.get("/api/projects", controller.listProjects);
  router.get("/api/projects/:projectId", controller.getProject);
  router.patch("/api/projects/:projectId", controller.updateProject);
  router.post("/api/projects/:projectId/generation-runs", controller.createRun);
  router.get("/api/generation-runs/:runId", controller.getRun);
  router.post("/api/generation-runs/:runId/cancel", controller.cancelRun);
  router.post("/api/planning/versions/lookup", controller.findSavedRequirement);
  router.get("/api/projects/:projectId/versions", controller.listVersions);
  router.get("/api/projects/:projectId/versions/compare", controller.compareVersions);
  router.post("/api/projects/:projectId/versions", controller.editVersion);
  router.get("/api/projects/:projectId/versions/:version", controller.getVersion);
  router.delete("/api/projects/:projectId/versions/:version", controller.deleteVersion);
  router.post("/api/projects/:projectId/versions/:version/accept", controller.acceptVersion);
  return router;
};
