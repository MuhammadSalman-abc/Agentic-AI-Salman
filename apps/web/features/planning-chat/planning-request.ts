export const requirementClarification = "Tell me what you’d like to build. Describe an app, website, or feature, and I’ll turn your requirement into features, user stories, and tasks.\n\nFor example: “Build a task manager where users can create, complete, and delete tasks.”";

type ApiFailure = Readonly<{ error?: Readonly<{ code?: string; message?: string; details?: readonly Readonly<{ code?: string; message?: string; path?: readonly (string | number)[] }>[] }> }>;

export class RequirementClarificationError extends Error {
  constructor() { super(requirementClarification); this.name = "RequirementClarificationError"; }
}

export const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = body as ApiFailure | null;
    if (response.status === 400 && failure?.error?.code === "validation_error" && Array.isArray(failure.error.details)
      && failure.error.details.some((issue) => issue.path?.length === 1 && issue.path[0] === "requirement" && issue.code === "custom" && issue.message === requirementClarification)) {
      throw new RequirementClarificationError();
    }
    throw new Error(failure?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  return body as T;
};
