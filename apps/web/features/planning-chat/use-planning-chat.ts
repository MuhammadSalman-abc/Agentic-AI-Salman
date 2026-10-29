"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isSmallTalk } from "./message-intent";
import { requestJson, requirementClarification, RequirementClarificationError } from "./planning-request";
import type {
  AcceptProjectVersionResponse, ArchitecturePlan, CreateProjectResponse, CreateRunResponse, FindSavedRequirementResponse, GetProjectVersionResponse,
  GetRunResponse, ListProjectsResponse, ListProjectVersionsResponse, PlanningProject, PlanningRun, PlanningTokenUsage, PlanningVersionSummary
} from "@workspace/types";

type ChatMessage = Readonly<{ id: string; role: "user" | "assistant"; text: string }>;
type SavedPlanPreview = Readonly<{ projectId: string; version: number; plan: ArchitecturePlan; accepted: boolean; usage: PlanningTokenUsage | null; source: "generation" | "user-edit" }>;


const stageLabels: Readonly<Record<PlanningRun["status"], string>> = {
  queued: "Getting things ready…",
  analyzing: "Understanding your requirement…",
  planning: "Generating your complete plan…",
  decomposing: "Breaking stories into tasks…",
  grooming: "Reviewing the plan…",
  validating: "Checking the plan structure…",
  succeeded: "Your plan is ready.",
  failed: "Generation failed.",
  cancelled: "Generation was cancelled."
};

const statusOrder: readonly PlanningRun["status"][] = ["planning", "validating", "succeeded"];

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
  const [savingEdits, setSavingEdits] = useState(false);
  const [planUsage, setPlanUsage] = useState<PlanningTokenUsage | null>(null);
  const [resultSource, setResultSource] = useState<"generation" | "database" | "user-edit">("generation");

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
          setPlanUsage(latest.usage ?? null);
          setResultSource(latest.source);
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
        accepted: project.acceptedVersion === version.version,
        usage: version.usage ?? null,
        source: version.source
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
    if (pending || savingEdits || submittedRequirement.length === 0) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: submittedRequirement };
    setRequirement("");
    setError(null);

    if (isSmallTalk(submittedRequirement)) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: requirementClarification
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setRequirement(submittedRequirement);
      return;
    }

    if (submittedRequirement.length < 3) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: requirementClarification
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setRequirement(submittedRequirement);
      return;
    }

    setPending(true);
    setRun(null);

    try {
      const { match } = await requestJson<FindSavedRequirementResponse>(`${apiBaseUrl}/api/planning/versions/lookup`, {
        method: "POST",
        body: JSON.stringify({ requirement: submittedRequirement, context: context.trim() })
      });
      setMessages([userMessage]);
      setRun(null);
      setPlan(null);
      setActiveVersion(null);
      setAcceptedVersion(null);
      setPlanUsage(null);
      setResultSource("generation");
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
        setPlanUsage(match.version.usage ?? null);
        setResultSource("database");
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
        setPlanUsage(latest.usage ?? null);
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
      if (cause instanceof RequirementClarificationError) {
        setMessages((current) => [...current, userMessage, { id: crypto.randomUUID(), role: "assistant", text: requirementClarification }]);
        setRequirement(submittedRequirement);
      } else setError(cause instanceof Error ? cause.message : "The API could not be reached.");
    } finally {
      setPending(false);
    }
  };

  const acceptPlan = async (target?: Readonly<{ projectId: string; version: number }>): Promise<void> => {
    const targetProjectId = target?.projectId ?? projectId;
    const targetVersion = target?.version ?? activeVersion;
    if (!targetProjectId || targetVersion === null || accepting || savingEdits) return;
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

  const startNewPlan = (): void => {
    if (pending || savingEdits) return;
    setHistoryOpen(false);
    setRequirement("");
    setProjectId(null);
    setProjectName("My AI project");
    setContext("");
    setMessages([]);
    setPlan(null);
    setRun(null);
    setActiveVersion(null);
    setAcceptedVersion(null);
    setError(null);
    setPlanUsage(null);
    setResultSource("generation");
  };

  const saveEditedPlan = async (target: Readonly<{ projectId: string; version: number }>, editedPlan: ArchitecturePlan): Promise<void> => {
    if (pending || savingEdits || accepting) throw new Error("Wait for the current operation to finish before saving edits.");
    setSavingEdits(true);
    try {
      const { version } = await requestJson<GetProjectVersionResponse>(`${apiBaseUrl}/api/projects/${target.projectId}/versions`, {
        method: "POST", body: JSON.stringify({ baseVersion: target.version, plan: editedPlan })
      });
      if (projectId === target.projectId && activeVersion === target.version) {
        setPlan(version.plan); setActiveVersion(version.version); setRun(null);
        setPlanUsage(null); setResultSource("user-edit");
      }
      setSavedPlanPreview((current) => current?.projectId === target.projectId && current.version === target.version
        ? { projectId: target.projectId, version: version.version, plan: version.plan, accepted: false, usage: null, source: "user-edit" } : current);
      setSavedProjects((current) => current.map((project) => project.id === target.projectId ? { ...project, currentVersion: version.version } : project));
      // Saving is already committed: a history refresh failure must not invite a duplicate save.
      try {
        const [{ project }, { versions }] = await Promise.all([
          requestJson<{ project: PlanningProject }>(`${apiBaseUrl}/api/projects/${target.projectId}`),
          requestJson<ListProjectVersionsResponse>(`${apiBaseUrl}/api/projects/${target.projectId}/versions`)
        ]);
        setSavedProjects((current) => current.map((item) => item.id === project.id ? project : item));
        setVersionsByProject((current) => ({ ...current, [project.id]: versions }));
        setHistoryError(null);
      } catch {
        // Invalidate the old list so opening history fetches the committed version again.
        setVersionsByProject((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== target.projectId)));
        setHistoryError("Edits were saved. Reopen Saved plans to refresh version history.");
      }
    } finally { setSavingEdits(false); }
  };

  return {
    projectName, setProjectName, context, setContext, requirement, setRequirement,
    projectId, activeVersion, savedProjects, versionsByProject, expandedHistoryProject,
    historyOpen, setHistoryOpen, openSavedPlans, historyLoading, historyError, messages, run, plan, savedPlanPreview,
    acceptedVersion, accepting, error, pending, loadProjectVersions, deleteSavedVersion, openSavedVersion,
    handleSubmit, acceptPlan, cancelRun, startNewPlan, stageLabels, statusOrder,
    saveEditedPlan, savingEdits, planUsage, resultSource
  };
};

export { usePlanningChat };
