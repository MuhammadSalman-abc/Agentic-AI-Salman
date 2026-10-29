"use client";

import { Check, ChevronDown, ClipboardList, Copy, LoaderCircle, MessageSquareText, Sparkles } from "lucide-react";
import type { ArchitecturePlan } from "@workspace/types";
import { Button, Card, CardContent } from "@workspace/ui/primitives";
import { useState, type ReactElement } from "react";
import { PlanEditor } from "./plan-editor.js";
import { PlanUsage, type PlanUsageProps } from "./plan-usage.js";

export type PlanResultProps = Readonly<{
  plan: ArchitecturePlan; version: number | null; accepted: boolean; accepting: boolean; onAccept: () => void;
  onSave?: ((plan: ArchitecturePlan) => Promise<void>) | undefined;
  usage?: PlanUsageProps["usage"];
  resultSource?: PlanUsageProps["source"] | undefined;
}>;

const taskTypeLabels = {
  technical_development: "Development",
  testing: "Testing",
  design: "Design",
  infrastructure: "Infrastructure",
  documentation: "Documentation"
} satisfies Record<ArchitecturePlan["tasks"][number]["taskType"], string>;

const formatFeatureForCopy = (feature: ArchitecturePlan["features"][number], stories: readonly ArchitecturePlan["stories"][number][], tasks: readonly ArchitecturePlan["tasks"][number][], brief: ArchitecturePlan["brief"]): string => {
  const lines = [
    `# ${feature.id}: ${feature.title}`,
    "",
    `Priority: ${feature.priority}`,
    `Requirement IDs: ${feature.requirementIds.join(", ")}`,
    "",
    feature.description
  ];

  for (const story of stories) {
    const storyTasks = tasks.filter(({ storyId }) => storyId === story.id).sort((left, right) => left.order - right.order);
    lines.push("", `## ${story.id}: ${story.title}`, "", story.description, "", `Priority: ${story.priority}`, `Requirement IDs: ${story.requirementIds.join(", ")}`, "", "Acceptance criteria:");
    lines.push(...story.acceptanceCriteria.map((criterion, index) => `- AC${String(index + 1)}: ${criterion}`));
    lines.push("", "Tasks:");
    for (const task of storyTasks) {
      lines.push(`- ${task.id} [${task.taskType}] ${task.title} (${task.priority})`, `  ${task.description}`);
      if (task.layer) lines.push(`  Layer: ${task.layer}`);
      if (task.acceptanceCriteriaIndexes && task.acceptanceCriteriaIndexes.length > 0) lines.push(`  Covers: ${task.acceptanceCriteriaIndexes.map((index) => `AC${String(index)}`).join(", ")}`);
      lines.push("  Completion criteria:");
      lines.push(...task.completionCriteria.map((criterion) => `  - ${criterion}`));
      if (task.dependsOn.length > 0) lines.push(`  Depends on: ${task.dependsOn.join(", ")}`);
    }
  }

  for (const [label, items] of [["Plan assumptions", brief.assumptions], ["Open questions", brief.openQuestions], ["Out of scope", brief.outOfScope ?? []]] as const) {
    lines.push("", `## ${label}`, ...(items.length > 0 ? items.map((item) => `- ${item}`) : ["None recorded."]));
  }
  return lines.join("\n");
};

export const PlanResult = ({ plan, version, accepted, accepting, onAccept, onSave, usage, resultSource }: PlanResultProps): ReactElement => {
  const [copyState, setCopyState] = useState<Readonly<{ featureId: string; status: "copied" | "failed" }> | null>(null);
  const visibleFeatures = plan.features.slice(0, 10);
  const visibleFeatureIds = new Set(visibleFeatures.map(({ id }) => id));
  const visibleStories = plan.stories.filter(({ featureId }) => visibleFeatureIds.has(featureId));
  const visibleStoryIds = new Set(visibleStories.map(({ id }) => id));
  const visibleTasks = plan.tasks.filter(({ storyId }) => visibleStoryIds.has(storyId));

  return (
    <Card className="plan-result overflow-hidden rounded-[1.4rem] border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.025]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-white via-white to-violet-50/50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm"><Check aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-base font-extrabold tracking-tight text-slate-950">{accepted ? "Plan accepted" : "Your plan is ready"}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{plan.brief.goals.join(" · ")}</p></div>
          {version && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/90 px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm"><span className="size-1.5 rounded-full bg-violet-500" />Version {version}</span>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5"><CountPill label="Features" value={visibleFeatures.length} tone="border-violet-100 bg-violet-50/80 text-violet-800" /><CountPill label="Stories" value={visibleStories.length} tone="border-sky-100 bg-sky-50/80 text-sky-800" /><CountPill label="Tasks" value={visibleTasks.length} tone="border-emerald-100 bg-emerald-50/80 text-emerald-800" /></div>
        {plan.features.length > 10 && <p className="mt-3 text-xs text-amber-700">This older saved plan has {plan.features.length} features; showing the first 10.</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/65 p-2.5 sm:px-3">
          <p className="flex items-center gap-2 text-[11px] text-slate-500"><ClipboardList aria-hidden="true" className="size-3.5 shrink-0 text-violet-500" />{accepted ? "This version is saved as your accepted plan." : "Review the details, then accept when you’re ready."}</p>
          <div className="flex flex-wrap gap-2">{onSave && version !== null && <PlanEditor plan={plan} version={version} onSave={onSave} disabled={accepting} />}<Button className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/15 transition hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg" disabled={accepted || accepting || !version} onClick={onAccept} size="sm" type="button">{accepting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}{accepted ? "Accepted" : accepting ? "Accepting…" : "Accept this plan"}</Button></div>
        </div>
      </div>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {resultSource && <PlanUsage usage={usage} source={resultSource} />}
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">The blueprint</p><h3 className="mt-0.5 text-sm font-extrabold tracking-tight text-slate-900">Feature hierarchy</h3></div><p className="text-[11px] text-slate-400">Open a feature, then a story, to see its tasks</p></div>
        {visibleFeatures.map((feature) => {
          const stories = visibleStories.filter(({ featureId }) => featureId === feature.id);
          const featureTasks = visibleTasks.filter(({ storyId }) => stories.some(({ id }) => id === storyId));
          return <div className="relative" key={feature.id}>
            <details className="group overflow-hidden rounded-2xl border border-violet-100/90 bg-white shadow-sm shadow-indigo-950/[0.025] transition duration-200 open:border-violet-200 open:shadow-md open:shadow-violet-950/[0.05]">
          <summary className="flex cursor-pointer list-none items-start gap-3 border-l-[3px] border-transparent p-3.5 pr-14 transition-colors hover:border-violet-300 hover:bg-violet-50/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 [&::-webkit-details-marker]:hidden sm:p-4 sm:pr-14">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-extrabold text-violet-800 shadow-sm">{feature.id.split("-").at(-1) ?? "F"}</span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{feature.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] capitalize text-slate-500">{feature.priority}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500">{feature.description}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700">{stories.length} user {stories.length === 1 ? "story" : "stories"}<ChevronDown aria-hidden="true" className="size-3 transition-transform group-open:rotate-180" /></span></span>
            </summary>
            <div className="space-y-2 border-t border-indigo-50 bg-slate-50/70 p-3">
              {stories.map((story) => {
                const tasks = visibleTasks.filter(({ storyId }) => storyId === story.id).sort((left, right) => left.order - right.order);
                return <details className="group/story rounded-xl border border-sky-100 bg-white shadow-sm shadow-sky-950/[0.02]" key={story.id}>
                  <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl p-3 text-sm transition-colors hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-800"><MessageSquareText aria-hidden="true" className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block font-medium text-slate-800">{story.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{story.description}</span></span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-open/story:rotate-180" /></summary>
                  <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Acceptance criteria</p>
                      <ul className="mt-1.5 space-y-1.5">{story.acceptanceCriteria.map((criterion, index) => <li className="flex gap-2 text-[11px] leading-4 text-slate-600" key={`${story.id}-criterion-${String(index + 1)}`}><span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 shadow-sm">AC{index + 1}</span><span>{criterion}</span></li>)}</ul>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks</p>
                    {tasks.map((task) => <div className="flex gap-2.5 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-2.5" key={task.id}><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{task.order}</span><div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-800"><span>{task.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-500">{taskTypeLabels[task.taskType]}{task.layer ? ` / ${task.layer}` : ""}</span></p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{task.description}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-4 text-slate-600">{task.completionCriteria.map((criterion, index) => <li key={`${task.id}-completion-${String(index)}`}>{criterion}</li>)}</ul><p className="mt-1 text-[9px] text-slate-400">{task.id} · {task.priority}{task.acceptanceCriteriaIndexes && task.acceptanceCriteriaIndexes.length > 0 ? ` · Covers ${task.acceptanceCriteriaIndexes.map((index) => `AC${String(index)}`).join(", ")}` : ""}{task.dependsOn.length > 0 ? ` · Depends on ${task.dependsOn.join(", ")}` : ""}</p></div></div>)}
                  </div>
                </details>;
              })}
            </div>
            </details>
            <Button
              aria-label={`Copy ${feature.title} with all stories and tasks`}
              className="absolute right-2.5 top-2.5 size-8 rounded-lg border-blue-100 bg-white/95 p-0 text-blue-600 shadow-sm hover:bg-blue-50"
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(formatFeatureForCopy(feature, stories, featureTasks, plan.brief));
                    setCopyState({ featureId: feature.id, status: "copied" });
                  } catch {
                    setCopyState({ featureId: feature.id, status: "failed" });
                  }
                })();
              }}
              size="icon"
              title={copyState?.featureId === feature.id ? copyState.status === "copied" ? "Feature copied" : "Copy failed; try again" : "Copy complete feature"}
              type="button"
              variant="outline"
            >
              {copyState?.featureId === feature.id && copyState.status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </Button>
            <span aria-live="polite" className="sr-only">{copyState?.featureId === feature.id ? copyState.status === "copied" ? `${feature.title} copied with all stories and tasks.` : `Could not copy ${feature.title}.` : ""}</span>
          </div>;
        })}
        <section aria-label="Plan assumptions and scope" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-amber-900"><Sparkles aria-hidden="true" className="size-3.5" />Assumptions and scope</h3>
          {([["Assumptions", plan.brief.assumptions], ["Open questions", plan.brief.openQuestions], ["Out of scope", plan.brief.outOfScope ?? []]] as const).map(([label, items]) => {
            const entries = items;
            return <div key={label}><h4 className="text-[11px] font-semibold text-amber-900">{label}</h4>{entries.length > 0 ? <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-4 text-amber-900/80">{entries.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-[11px] text-slate-500">None recorded.</p>}</div>;
          })}
        </section>
      </CardContent>
    </Card>
  );
};

const CountPill = ({ label, value, tone }: { label: string; value: number; tone: string }): ReactElement => <span className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 ${tone}`}><span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80 sm:text-[11px]">{label}</span><span className="text-lg font-extrabold leading-none tabular-nums">{value}</span></span>;


