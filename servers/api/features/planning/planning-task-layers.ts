import type { ArchitecturePlanInput } from "./planning.validation.js";

/** A testing task has one unambiguous layer, regardless of the system it tests. */
export const normalizeTestingLayers = (plan: ArchitecturePlanInput): ArchitecturePlanInput => ({
  ...plan,
  tasks: plan.tasks.map((task) => task.taskType === "testing" && task.layer !== "testing"
    ? { ...task, layer: "testing" }
    : task)
});
