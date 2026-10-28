import type { LlmGenerationRequest, LlmProvider } from "../../llm/provider.js";

export const createPlanningFixtureProvider = (): LlmProvider => ({
  name: "groq",
  model: "e2e-fake-model",
  generateJson: ({ stage, onUsage }: LlmGenerationRequest): Promise<unknown> => {
    onUsage?.({ inputTokens: 80, outputTokens: 60, totalTokens: 140 });
    if (stage === "planning") return Promise.resolve({
      brief: {
        goals: ["Allow the user to save an architecture plan."],
        requirements: [{
          id: "REQ-E2E-1", text: "The API must persist a generated plan.",
          acceptanceCriteria: ["A saved plan can be retrieved by version."],
          coverage: "addressed", coverageExplanation: null
        }],
        constraints: [], assumptions: [], openQuestions: []
      },
      features: [
        { id: "FEAT-E2E-1", title: "Plan version storage", description: "Save generated plans as immutable versions.", priority: "high", requirementIds: ["REQ-E2E-1"] },
        { id: "FEAT-E2E-2", title: "Plan version retrieval", description: "Retrieve a saved plan by its project and version.", priority: "high", requirementIds: ["REQ-E2E-1"] },
        { id: "FEAT-E2E-3", title: "Project version history", description: "Keep the project's current version pointer consistent.", priority: "medium", requirementIds: ["REQ-E2E-1"] }
      ],
      stories: [
        { id: "STORY-E2E-1", featureId: "FEAT-E2E-1", requirementIds: ["REQ-E2E-1"], title: "Persist a generated plan", description: "As a user, I can save a validated plan as a version.", acceptanceCriteria: ["The complete plan and version metadata are stored atomically."], priority: "high" },
        { id: "STORY-E2E-2", featureId: "FEAT-E2E-2", requirementIds: ["REQ-E2E-1"], title: "Retrieve a saved plan", description: "As a user, I can load the complete plan by version.", acceptanceCriteria: ["The version API returns the complete plan."], priority: "high" },
        { id: "STORY-E2E-3", featureId: "FEAT-E2E-3", requirementIds: ["REQ-E2E-1"], title: "Track the current plan version", description: "As a user, I can see the project's current saved version.", acceptanceCriteria: ["The project points to the version created by generation."], priority: "medium" }
      ],
      tasks: [
        { id: "TASK-E2E-1", storyId: "STORY-E2E-1", title: "Persist plan version", description: "Save the validated plan and its version metadata.", taskType: "technical_development", layer: "backend", acceptanceCriteriaIndexes: [1], completionCriteria: ["The version is written atomically."], priority: "high", dependsOn: [], order: 1 },
        { id: "TASK-E2E-2", storyId: "STORY-E2E-2", title: "Read plan version by number", description: "Load the complete saved plan through the version endpoint.", taskType: "technical_development", layer: "backend", acceptanceCriteriaIndexes: [1], completionCriteria: ["The API can read the saved version."], priority: "high", dependsOn: ["TASK-E2E-1"], order: 2 },
        { id: "TASK-E2E-3", storyId: "STORY-E2E-3", title: "Update current version pointer", description: "Point the project to the newly committed version.", taskType: "technical_development", layer: "backend", acceptanceCriteriaIndexes: [1], completionCriteria: ["The project currentVersion is one."], priority: "medium", dependsOn: ["TASK-E2E-1"], order: 3 }
      ].flatMap((task) => [task, { ...task, id: `TEST-${task.id}`, taskType: "testing", layer: "testing", dependsOn: [task.id], title: `Test ${task.title}`, completionCriteria: task.completionCriteria.map((criterion) => `Verify: ${criterion}`) }])
    });
    return Promise.reject(new Error(`Unexpected E2E provider stage: ${stage}`));
  }
});

