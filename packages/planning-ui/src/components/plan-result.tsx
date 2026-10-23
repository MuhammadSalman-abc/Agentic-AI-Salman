"use client";

import { Check, ChevronDown, ClipboardList, LoaderCircle, MessageSquareText, Sparkles } from "lucide-react";
import type { ArchitecturePlan } from "@workspace/types";
import { Button, Card, CardContent } from "@workspace/ui/primitives";
import type { ReactElement } from "react";

export type PlanResultProps = Readonly<{ plan: ArchitecturePlan; version: number | null; accepted: boolean; accepting: boolean; onAccept: () => void }>;

export const PlanResult = ({ plan, version, accepted, accepting, onAccept }: PlanResultProps): ReactElement => {
  const visibleFeatures = plan.features.slice(0, 10);
  const visibleFeatureIds = new Set(visibleFeatures.map(({ id }) => id));
  const visibleStories = plan.stories.filter(({ featureId }) => visibleFeatureIds.has(featureId));
  const visibleStoryIds = new Set(visibleStories.map(({ id }) => id));
  const visibleTasks = plan.tasks.filter(({ storyId }) => visibleStoryIds.has(storyId));

  return (
    <Card className="overflow-hidden rounded-2xl border-white bg-white/95 shadow-xl shadow-indigo-950/[0.06] ring-1 ring-indigo-100/70">
      <div className="border-b border-violet-100/80 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm"><Check aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-base font-extrabold tracking-tight text-slate-950">{accepted ? "Plan accepted" : "Your plan is ready"}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{plan.brief.goals.join(" · ")}</p></div>
          {version && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/90 px-3 py-1.5 text-[11px] font-bold text-indigo-700 shadow-sm"><span className="size-1.5 rounded-full bg-violet-500" />Version {version}</span>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5"><CountPill label="Features" value={visibleFeatures.length} tone="border-violet-100 bg-violet-50/80 text-violet-800" /><CountPill label="Stories" value={visibleStories.length} tone="border-sky-100 bg-sky-50/80 text-sky-800" /><CountPill label="Tasks" value={visibleTasks.length} tone="border-emerald-100 bg-emerald-50/80 text-emerald-800" /></div>
        {plan.features.length > 10 && <p className="mt-3 text-xs text-amber-700">This older saved plan has {plan.features.length} features; showing the first 10.</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/65 p-2.5 sm:px-3">
          <p className="flex items-center gap-2 text-[11px] text-slate-500"><ClipboardList aria-hidden="true" className="size-3.5 shrink-0 text-violet-500" />{accepted ? "This version is saved as your accepted plan." : "Review the details, then accept when you’re ready."}</p>
          <Button className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/15 transition hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg" disabled={accepted || accepting || !version} onClick={onAccept} size="sm" type="button">{accepting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}{accepted ? "Accepted" : accepting ? "Accepting…" : "Accept this plan"}</Button>
        </div>
      </div>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">The blueprint</p><h3 className="mt-0.5 text-sm font-extrabold tracking-tight text-slate-900">Feature hierarchy</h3></div><p className="text-[11px] text-slate-400">Open a feature, then a story, to see its tasks</p></div>
        {visibleFeatures.map((feature) => {
          const stories = visibleStories.filter(({ featureId }) => featureId === feature.id);
          return <details className="group overflow-hidden rounded-2xl border border-violet-100/90 bg-white shadow-sm shadow-indigo-950/[0.025] transition duration-200 open:border-violet-200 open:shadow-md open:shadow-violet-950/[0.05]" key={feature.id}>
          <summary className="flex cursor-pointer list-none items-start gap-3 border-l-[3px] border-transparent p-3.5 transition-colors hover:border-violet-300 hover:bg-violet-50/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 [&::-webkit-details-marker]:hidden sm:p-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-xs font-extrabold text-violet-800 shadow-sm">{feature.id.split("-").at(-1) ?? "F"}</span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{feature.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] capitalize text-slate-500">{feature.priority}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500">{feature.description}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700">{stories.length} user {stories.length === 1 ? "story" : "stories"}<ChevronDown aria-hidden="true" className="size-3 transition-transform group-open:rotate-180" /></span></span>
            </summary>
            <div className="space-y-2 border-t border-indigo-50 bg-slate-50/70 p-3">
              {stories.map((story) => {
                const tasks = visibleTasks.filter(({ storyId }) => storyId === story.id).sort((left, right) => left.order - right.order);
                return <details className="group/story rounded-xl border border-sky-100 bg-white shadow-sm shadow-sky-950/[0.02]" key={story.id}>
                  <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl p-3 text-sm transition-colors hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-800"><MessageSquareText aria-hidden="true" className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block font-medium text-slate-800">{story.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{story.description}</span></span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-open/story:rotate-180" /></summary>
                  <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks</p>
                    {tasks.map((task) => <div className="flex gap-2.5 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-2.5" key={task.id}><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{task.order}</span><div><p className="text-xs font-medium text-slate-800">{task.title}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{task.description}</p></div></div>)}
                  </div>
                </details>;
              })}
            </div>
          </details>;
        })}
        {(plan.brief.assumptions.length > 0 || plan.brief.openQuestions.length > 0) && <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-amber-900 [&::-webkit-details-marker]:hidden"><Sparkles aria-hidden="true" className="size-3.5" />Assumptions and open questions<ChevronDown aria-hidden="true" className="ml-auto size-3.5" /></summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{plan.brief.assumptions.length > 0 && <div><p className="text-[11px] font-semibold text-amber-900">Assumptions</p><ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-4 text-amber-900/80">{plan.brief.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>}{plan.brief.openQuestions.length > 0 && <div><p className="text-[11px] font-semibold text-amber-900">Open questions</p><ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-4 text-amber-900/80">{plan.brief.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div></details>}
      </CardContent>
    </Card>
  );
};

const CountPill = ({ label, value, tone }: { label: string; value: number; tone: string }): ReactElement => <span className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 ${tone}`}><span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80 sm:text-[11px]">{label}</span><span className="text-lg font-extrabold leading-none tabular-nums">{value}</span></span>;


