"use client";

import { ChevronDown, ClipboardList, LoaderCircle, Search, Trash2 } from "lucide-react";
import { useState, type ReactElement } from "react";
import type { ArchitecturePlan, PlanningProject, PlanningVersionSummary } from "@workspace/types";
import { Button } from "@workspace/ui/primitives";
import { PlanResult } from "./plan-result.js";

export type SavedPlansProps = Readonly<{
  projects: readonly PlanningProject[];
  versionsByProject: Readonly<Record<string, readonly PlanningVersionSummary[]>>;
  expandedProjectId: string | null;
  activeProjectId: string | null;
  activeVersion: number | null;
  selectedPlan: ArchitecturePlan | null;
  accepted: boolean;
  accepting: boolean;
  loading: boolean;
  error: string | null;
  onToggleProject: (project: PlanningProject) => void;
  onSelectVersion: (project: PlanningProject, version: number) => void;
  onRemoveVersion: (project: PlanningProject, version: number) => void;
  onAccept: () => void;
  onClose: () => void;
}>;

export const SavedPlans = ({ projects, versionsByProject, expandedProjectId, activeProjectId, activeVersion, selectedPlan, accepted, accepting, loading, error, onToggleProject, onSelectVersion, onRemoveVersion, onAccept, onClose }: SavedPlansProps): ReactElement => {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visibleProjects = projects.filter((project) => {
    if (!query || project.name.toLocaleLowerCase().includes(query)) return true;
    return (versionsByProject[project.id] ?? []).some(({ requirementSummary }) => requirementSummary?.toLocaleLowerCase().includes(query));
  });

  return (
  <section aria-label="Saved plans history" className="mx-auto w-full rounded-3xl border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/50 to-sky-50/60 p-4 shadow-md shadow-indigo-950/[0.04] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700"><ClipboardList aria-hidden="true" className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Your workspace</p>
          <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-950">Saved plans</h2>
        </div>
      </div>
      <Button className="shrink-0 rounded-xl border border-violet-100 bg-white/80 text-xs font-semibold text-violet-800 shadow-sm hover:bg-violet-50" onClick={onClose} size="sm" type="button">Back to chat</Button>
    </div>
    <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Each version shows the requirement it was created from. Select one to inspect its features, stories, and tasks beside the list.</p>
    <label className="mt-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-white/90 px-3 py-2.5 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100"><Search aria-hidden="true" className="size-4 shrink-0 text-violet-500" /><input aria-label="Search saved plans by requirement or project" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" onChange={(event) => { setSearch(event.target.value); }} placeholder="Find a requirement or project…" value={search} /></label>
    {loading && <p className="mt-3 flex items-center gap-2 rounded-xl bg-white/80 p-2.5 text-[11px] text-violet-700"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />Loading saved plans…</p>}
    {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] leading-4 text-rose-800">{error}</p>}
    {!loading && projects.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-violet-200 bg-white/70 p-3 text-[11px] leading-4 text-slate-500">No saved plans yet. Generated plans will appear here.</p>}
    <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
      {visibleProjects.map((project) => <div className="rounded-2xl border border-violet-100/70 bg-white/85 p-3 shadow-sm shadow-indigo-950/[0.03] transition hover:border-violet-200 hover:shadow-md sm:p-4" key={project.id}>
        <button className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" onClick={() => { onToggleProject(project); }} type="button">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700"><ClipboardList aria-hidden="true" className="size-4" /></span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{project.name}</span>
          <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{versionsByProject[project.id]?.length ?? project.currentVersion ?? 0} versions</span>
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${expandedProjectId === project.id ? "rotate-180" : ""}`} />
        </button>
        {expandedProjectId === project.id && <div className="mt-3 space-y-1.5 border-t border-violet-100 pt-3">
          {(versionsByProject[project.id] ?? []).filter((version) => !query || project.name.toLocaleLowerCase().includes(query) || version.requirementSummary?.toLocaleLowerCase().includes(query)).map((version) => {
            const selected = project.id === activeProjectId && version.version === activeVersion;
            return <div className={`flex items-start gap-1 rounded-xl pr-1 transition ${selected ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200" : "text-slate-700 hover:bg-violet-50"}`} key={version.version}>
              <button aria-current={selected ? "true" : undefined} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-2.5 text-left" onClick={() => { onSelectVersion(project, version.version); }} type="button">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-violet-700 shadow-sm">V{version.version}</span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2 break-words text-xs font-semibold" title={version.requirementSummary ?? undefined}>{version.requirementSummary?.trim() || (version.source === "generation" ? "AI generated plan" : `Edits to version ${String(version.basedOnVersion ?? "previous")}`)}</span><span className="mt-1 block text-[10px] text-slate-400">{version.source === "generation" ? "AI plan" : "Edited"} · {new Date(version.createdAt).toLocaleDateString()}</span></span>
              </button>
              <button aria-label={`Remove version ${String(version.version)}`} className="mt-2 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => { onRemoveVersion(project, version.version); }} title="Remove version; remaining versions will be renumbered" type="button"><Trash2 aria-hidden="true" className="size-3.5" /></button>
            </div>;
          })}
          {(versionsByProject[project.id] ?? []).length === 0 && <p className="px-3 py-2 text-[11px] text-slate-500">No generated versions yet.</p>}
        </div>}
      </div>)}
      {visibleProjects.length === 0 && <p className="rounded-xl border border-dashed border-violet-200 bg-white/70 p-3 text-xs text-slate-500">No plans match “{search}”.</p>}
      </div>
      <div className="min-w-0">
        {activeProjectId && activeVersion !== null && selectedPlan ? <PlanResult plan={selectedPlan} version={activeVersion} accepted={accepted} accepting={accepting} onAccept={onAccept} /> : <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-white/60 p-6 text-center"><p className="max-w-sm text-sm leading-6 text-slate-500">Select a version to preview its plan here. The version list stays beside the preview so you can switch between plans quickly.</p></div>}
      </div>
    </div>
  </section>
  );
};

