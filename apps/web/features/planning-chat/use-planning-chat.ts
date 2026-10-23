"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isSmallTalk } from "./message-intent";
import type {
  AcceptProjectVersionResponse, ArchitecturePlan, CreateProjectResponse, CreateRunResponse, FindSavedRequirementResponse, GetProjectVersionResponse,
  GetRunResponse, ListProjectsResponse, ListProjectVersionsResponse, PlanningProject, PlanningRun, PlanningVersionSummary
} from "@workspace/types";

type ApiFailure = Readonly<{ error?: Readonly<{ message?: string }> }>;
type ChatMessage = Readonly<{ id: string; role: "user" | "assistant"; text: string }>;
type SavedPlanPreview = Readonly<{ projectId: string; version: number; plan: ArchitecturePlan; accepted: boolean }>;

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = body as ApiFailure | null;
    throw new Error(failure?.error?.message ?? `Request failed with status ${response.status}.`);
  }
  return body as T;
};

const stageLabels: Readonly<Record<PlanningRun["status"], string>> = {
  queued: "Getting things ready…",
  analyzing: "Understanding your requirement…",
  planning: "Designing features and stories…",
  decomposing: "Breaking stories into tasks…",
  grooming: "Reviewing the plan…",
  validating: "Checking the plan structure…",
  succeeded: "Your plan is ready.",
  failed: "Generation failed.",
  cancelled: "Generation was cancelled."
};

const statusOrder: readonly PlanningRun["status"][] = ["analyzing", "planning", "decomposing", "grooming", "validating", "succeeded"];

const usePlanningChat = (apiBaseUrl: string) => {
  const [projectName, setProjectName] = useState("My AI project");
  const [context, setContext] = useState("");
  const [requirement, setRequirement] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);
  const [savedProjects, setSavedProjects] = useState<readonly PlanningProject[]>([]);
  const [versionsByProject, setVersionsByProject] = useState<Readonly<Record<string, readonly PlanningVersionSummary[]>>>({});
  const [expandedHistoryProject, setExpandedHistoryProject] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [savedPlanPreview, setSavedPlanPreview] = useState<SavedPlanPreview | null>(null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [run, setRun] = useState<PlanningRun | null>(null);
  const [plan, setPlan] = useState<ArchitecturePlan | null>(null);
  const [acceptedVersion, setAcceptedVersion] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSavedProjects = async (): Promise<void> => {
      setHistoryLoading(true);
      try {
        const { projects } = await requestJson<ListProjectsResponse>(`${apiBaseUrl}/api/projects?limit=50`);
        if (!active) return;
        setSavedProjects(projects);
      } catch (cause) {
        if (active) setHistoryError(cause instanceof Error ? cause.message : "Saved plans could not be loaded.");
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    void loadSavedProjects();
    return () => { active = false; };
  }, [apiBaseUrl]);

  const loadProjectVersions = async (project: PlanningProject): Promise<void> => {
    setHistoryError(null);
    if (versionsByProject[project.id]) {
      setExpandedHistoryProject((current) => current === project.id ? null : project.id);
      return;
    }
    setHistoryLoading(true);
    try {
      const { versions } = await requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions`);
      const { project: refreshedProject } = await requestJson<{ project: PlanningProject }>(`${apiBaseUrl}/api/projects/${project.id}`);
      setSavedProjects((current) => current.map((item) => item.id === refreshedProject.id ? refreshedProject : item));
      setVersionsByProject((current) => ({ ...current, [project.id]: versions }));
      setExpandedHistoryProject(project.id);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "Version history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSavedPlans = async (): Promise<void> => {
    setHistoryOpen(true);
    if (savedProjects.length === 0) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const loaded = await Promise.all(savedProjects.map(async (project) => {
        const { versions } = await requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions`);
        const { project: refreshedProject } = await requestJson<{ project: PlanningProject }>(`${apiBaseUrl}/api/projects/${project.id}`);
        return { project: refreshedProject, versions };
      }));
      setSavedProjects((current) => current.map((project) => loaded.find(({ project: refreshed }) => refreshed.id === project.id)?.project ?? project));
      setVersionsByProject((current) => ({ ...current, ...Object.fromEntries(loaded.map(({ project, versions }) => [project.id, versions])) }));
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "Some saved version lists could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteSavedVersion = async (project: PlanningProject, versionNumber: number): Promise<void> => {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      await requestJson<unknown>(`${apiBaseUrl}/api/projects/${project.id}/versions/${versionNumber}`, { method: "DELETE" });
      const [{ project: updatedProject }, { versions }] = await Promise.all([
        requestJson<{ project: PlanningProject }>(`${apiBaseUrl}/api/projects/${project.id}`),
        requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions`)
      ]);
      setSavedProjects((current) => current.map((item) => item.id === updatedProject.id ? updatedProject : item));
      setVersionsByProject((current) => ({ ...current, [project.id]: versions }));
      setSavedPlanPreview((current) => current?.projectId === project.id ? null : current);

      if (projectId === project.id) {
        setAcceptedVersion(updatedProject.acceptedVersion);
        setRun(null);
        if (updatedProject.currentVersion === null) {
          setActiveVersion(null);
          setPlan(null);
          setAcceptedVersion(null);
          setMessages([]);
        } else {
          const { version: latest } = await requestJson<GetProjectVersionResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions/${updatedProject.currentVersion}`);
          setProjectName(updatedProject.name);
          setContext(updatedProject.context);
          setActiveVersion(latest.version);
          setPlan(latest.plan);
          setAcceptedVersion(updatedProject.acceptedVersion);
        }
      }
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "This version could not be removed.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSavedVersion = async (project: PlanningProject, versionNumber: number): Promise<void> => {
    if (savedPlanPreview?.projectId === project.id && savedPlanPreview.version === versionNumber) {
      setSavedPlanPreview(null);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { version } = await requestJson<GetProjectVersionResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions/${versionNumber}`);
      setSavedPlanPreview({
        projectId: project.id,
        version: version.version,
        plan: version.plan,
        accepted: project.acceptedVersion === version.version
      });
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "This saved plan could not be opened.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const submittedRequirement = requirement.trim();
    if (pending || submittedRequirement.length === 0) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: submittedRequirement };
    setRequirement("");
    setError(null);

    if (isSmallTalk(submittedRequirement)) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Main theek hoon, shukriya! Tum sunao? Jab app ya software ki requirement plan karwani ho, bas uska idea bhej dena."
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      return;
    }

    if (submittedRequirement.length < 20) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Apni requirement thodi aur detail se batayein—yeh kis user ke liye hai, aur woh kya karna chahta hai?"
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      return;
    }

    setMessages([userMessage]);
    setPending(true);
    setRun(null);
    setPlan(null);
    setActiveVersion(null);
    setAcceptedVersion(null);

    try {
      const { match } = await requestJson<FindSavedRequirementResponse>(`${apiBaseUrl}/api/planning/versions/lookup`, {
        method: "POST",
        body: JSON.stringify({ requirement: submittedRequirement, context: context.trim() })
      });
      if (match) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I found this requirement in your saved plans and loaded it from the database without calling the AI."
        };
        setProjectId(match.project.id);
        setProjectName(match.project.name);
        setContext(match.project.context);
        setActiveVersion(match.version.version);
        setAcceptedVersion(match.project.acceptedVersion);
        setPlan(match.version.plan);
        setRun(null);
        setMessages([userMessage, assistantMessage]);
        setSavedProjects((current) => [match.project, ...current.filter(({ id }) => id !== match.project.id)]);
        try {
          const { versions } = await requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${match.project.id}/versions`);
          setVersionsByProject((current) => ({ ...current, [match.project.id]: versions }));
        } catch (cause) {
          setHistoryError(cause instanceof Error ? cause.message : "The plan was loaded, but its history could not be refreshed.");
        }
        return;
      }

      const { project } = await requestJson<CreateProjectResponse>(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim(), context: context.trim() })
      });
      setProjectId(project.id);
      const { run: started } = await requestJson<CreateRunResponse>(`${apiBaseUrl}/api/projects/${project.id}/generation-runs`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ requirement: submittedRequirement })
      });
      setRun(started);

      let latest = started;
      while (!["succeeded", "failed", "cancelled"].includes(latest.status)) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1_300));
        const current = await requestJson<GetRunResponse>(`${apiBaseUrl}/api/generation-runs/${started.id}`);
        latest = current.run;
        setRun(latest);
        if (current.plan) setPlan(current.plan);
      }
      if (latest.status === "succeeded" && latest.resultVersion !== null) {
        setActiveVersion(latest.resultVersion);
        try {
          const [{ project: updatedProject }, { versions }] = await Promise.all([
            requestJson<{ project: PlanningProject }>(`${apiBaseUrl}/api/projects/${project.id}`),
            requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${project.id}/versions`)
          ]);
          setSavedProjects((current) => [updatedProject, ...current.filter(({ id }) => id !== updatedProject.id)]);
          setVersionsByProject((current) => ({ ...current, [project.id]: versions }));
        } catch (cause) {
          setHistoryError(cause instanceof Error ? cause.message : "The plan is saved, but history could not be refreshed.");
        }
      }
      if (latest.status === "failed") setError(latest.error?.message ?? "Plan generation failed. Please try again.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The API could not be reached.");
    } finally {
      setPending(false);
    }
  };

  const acceptPlan = async (target?: Readonly<{ projectId: string; version: number }>): Promise<void> => {
    const targetProjectId = target?.projectId ?? projectId;
    const targetVersion = target?.version ?? activeVersion;
    if (!targetProjectId || targetVersion === null || accepting) return;
    setAccepting(true);
    setError(null);
    try {
      const { project } = await requestJson<AcceptProjectVersionResponse>(`${apiBaseUrl}/api/projects/${targetProjectId}/versions/${targetVersion}/accept`, { method: "POST" });
      if (projectId === project.id && activeVersion === targetVersion) setAcceptedVersion(project.acceptedVersion);
      setSavedPlanPreview((current) => current?.projectId === project.id && current.version === targetVersion ? { ...current, accepted: true } : current);
      setSavedProjects((current) => current.map((item) => item.id === project.id ? project : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This plan could not be accepted.");
    } finally {
      setAccepting(false);
    }
  };

  const cancelRun = async (): Promise<void> => {
    if (!run || !pending) return;
    try {
      const { run: cancelled } = await requestJson<{ run: PlanningRun }>(`${apiBaseUrl}/api/generation-runs/${run.id}/cancel`, { method: "POST" });
      setRun(cancelled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This run could not be cancelled.");
    }
  };

  return {
    projectName, setProjectName, context, setContext, requirement, setRequirement,
    projectId, activeVersion, savedProjects, versionsByProject, expandedHistoryProject,
    historyOpen, setHistoryOpen, openSavedPlans, historyLoading, historyError, messages, run, plan, savedPlanPreview,
    acceptedVersion, accepting, error, pending, loadProjectVersions, deleteSavedVersion, openSavedVersion,
    handleSubmit, acceptPlan, cancelRun, stageLabels, statusOrder
  };
};

export { usePlanningChat };
