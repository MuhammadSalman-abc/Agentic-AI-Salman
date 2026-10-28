import type { ArchitecturePlanInput } from "./planning.validation.js";

/** Suggest tests from explicit criteria without changing model-authored mappings or implementation. */
export const completeMissingTestCoverage = (plan: ArchitecturePlanInput): ArchitecturePlanInput => {
  const tasks = [...plan.tasks];
  const taskIds = new Set(tasks.map(({ id }) => id));
  let sequence = 0;
  const dependsOnImplementation = (taskId: string, implementationId: string, visited = new Set<string>()): boolean => {
    if (visited.has(taskId)) return false;
    visited.add(taskId);
    const task = tasks.find(({ id }) => id === taskId);
    return task?.dependsOn.some((id) => id === implementationId || dependsOnImplementation(id, implementationId, visited)) ?? false;
  };

  for (const story of plan.stories) {
    for (const [index, criterion] of story.acceptanceCriteria.entries()) {
      const criterionNumber = index + 1;
      const linkedTasks = tasks.filter((task) => task.storyId === story.id
        && task.acceptanceCriteriaIndexes?.includes(criterionNumber));
      const implementations = linkedTasks.filter(({ taskType }) => taskType === "technical_development");
      const untestedImplementations = implementations.filter((implementation) => !linkedTasks.some((task) =>
        task.taskType === "testing" && dependsOnImplementation(task.id, implementation.id)));
      // Missing implementation is a genuine planning gap and must still fail validation.
      if (untestedImplementations.length === 0) continue;

      let id: string;
      do {
        sequence += 1;
        id = `LOCAL-TEST-${String(sequence)}`;
      } while (taskIds.has(id));
      taskIds.add(id);
      tasks.push({
        id,
        storyId: story.id,
        title: `Suggested test AC${String(criterionNumber)}: ${story.title}`.slice(0, 160),
        description: `Add a test for ${story.id} AC${String(criterionNumber)}. Expected behavior: ${criterion}`.slice(0, 2_000),
        taskType: "testing",
        layer: "testing",
        acceptanceCriteriaIndexes: [criterionNumber],
        completionCriteria: [criterion],
        priority: story.priority,
        dependsOn: untestedImplementations.map(({ id: implementationId }) => implementationId),
        order: tasks.length + 1
      });
    }
  }

  return { ...plan, tasks };
};
