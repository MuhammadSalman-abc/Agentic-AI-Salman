"use client";

import { ArrowRight, ChevronDown, ClipboardList } from "lucide-react";
import type { ReactElement } from "react";
import { Input, Label } from "@workspace/ui/primitives";
import { MascotMark } from "./mascot-mark.js";

export type ProjectSetupProps = Readonly<{ projectName: string; setProjectName: (value: string) => void; context: string; setContext: (value: string) => void }>;
export type SuggestionProps = Readonly<{ text: string; onChoose: (value: string) => void }>;
export type WorkflowStepProps = Readonly<{ number: string; title: string; detail: string; icon: ReactElement; tone: string }>;

export const ProjectSetup = ({ projectName, setProjectName, context, setContext }: ProjectSetupProps): ReactElement => (
  <details className="group mb-3 rounded-2xl border border-white bg-white/75 px-3 py-2.5 shadow-sm shadow-indigo-950/[0.03] backdrop-blur-sm transition open:border-violet-100 open:bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-700 [&::-webkit-details-marker]:hidden"><span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700"><ClipboardList className="size-3.5" /></span>Personalize your project <ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
    <div className="mt-2 grid gap-3 border-t border-violet-50 pt-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label className="text-xs text-slate-600" htmlFor="project-name">Project name</Label><Input className="h-9 rounded-lg border-indigo-100 bg-white text-sm" id="project-name" maxLength={100} minLength={2} onChange={(event) => { setProjectName(event.target.value); }} placeholder="e.g. Fitness booking app" required value={projectName} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-slate-600" htmlFor="project-context">Extra context <span className="font-normal text-slate-400">(optional)</span></Label><Input className="h-9 rounded-lg border-indigo-100 bg-white text-sm" id="project-context" maxLength={8_000} onChange={(event) => { setContext(event.target.value); }} placeholder="Users, stack, constraints…" value={context} /></div>
    </div>
  </details>
);

export const Suggestion = ({ text, onChoose }: SuggestionProps): ReactElement => (
  <button className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-indigo-100/80 bg-white/85 p-3 text-left text-xs leading-5 text-slate-600 shadow-sm shadow-indigo-950/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" onClick={() => { onChoose(text); }} type="button"><span>{text}</span><ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-violet-500 transition group-hover:translate-x-0.5" /></button>
);

export const AssistantAvatar = ({ thinking = false }: Readonly<{ thinking?: boolean }> = {}): ReactElement => <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-[#101a43] shadow-sm"><MascotMark className="size-8" mood={thinking ? "thinking" : "idle"} /></span>;

export const WorkflowStep = ({ number, title, detail, icon, tone }: WorkflowStepProps): ReactElement => (
  <div className="group flex gap-3 rounded-xl border border-white bg-white/75 p-3 shadow-sm shadow-indigo-950/[0.03] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span><div><p className="text-[10px] font-bold tracking-widest text-slate-400">{number}</p><h3 className="mt-0.5 text-xs font-semibold text-slate-800">{title}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p></div></div>
);

