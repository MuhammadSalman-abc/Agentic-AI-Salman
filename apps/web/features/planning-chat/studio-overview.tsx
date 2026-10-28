import { ArrowDown, Check, ClipboardList, Lightbulb, ListChecks, MessageSquareText, Sparkles } from "lucide-react";
import type { ReactElement } from "react";
import type { ArchitecturePlan } from "@workspace/types";
import { MascotMark } from "@workspace/planning-ui";

export const StudioOverview = ({ plan, pending, accepted }: Readonly<{ plan: ArchitecturePlan | null; pending: boolean; accepted: boolean }>): ReactElement => (
  <aside aria-label="Planning overview" className="planning-chat-scroll hidden min-h-0 overflow-y-auto border-l border-slate-200/70 bg-white/65 p-5 xl:block">
    <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your planning partner</p><span className={`size-1.5 rounded-full ${pending ? "animate-pulse bg-violet-500" : "bg-emerald-400"}`} /></div>
    <div className="studio-mascot-card mt-4 flex flex-col items-center overflow-hidden rounded-2xl px-4 py-5 text-center"><MascotMark className="size-28 rounded-2xl" mood={pending ? "thinking" : "idle"} /><p className="mt-1 text-sm font-semibold text-white">{pending ? "Connecting the dots…" : plan ? "Your idea, organized." : "Good ideas deserve a plan."}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">{pending ? "Shaping your brief into something you can build." : "A little structure makes the next step clearer."}</p></div>
    <p className="mb-4 mt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">The journey</p>
    <div className="space-y-1">{[
      { icon: MessageSquareText, title: "Start with your idea", description: "Tell us what you want to build." },
      { icon: Sparkles, title: "Find the structure", description: "Features → Stories → Tasks" },
      { icon: ListChecks, title: "Make it yours", description: "Explore, refine, and accept your plan." }
    ].map(({ icon: Icon, title, description }, index) => <div key={title}><div className="flex items-start gap-3 py-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50/70 text-violet-600"><Icon className="size-3.5" /></span><div><p className="text-[11px] font-semibold text-slate-700">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p></div></div>{index < 2 && <ArrowDown className="ml-3 size-3 text-slate-200" />}</div>)}</div>
    {plan && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[11px] font-semibold text-slate-700"><ClipboardList className="size-3.5 text-violet-500" />Current blueprint</p><dl className="mt-4 space-y-3">{[["Features", plan.features.length], ["User stories", plan.stories.length], ["Tasks", plan.tasks.length]].map(([label, count]) => <div key={label} className="flex justify-between text-[11px]"><dt className="text-slate-500">{label}</dt><dd className="font-semibold tabular-nums text-slate-800">{count}</dd></div>)}</dl><p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-emerald-600"><Check className="size-3" />{accepted ? "Accepted by you" : "Saved for your review"}</p></div>}
    <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><Lightbulb className="size-4 text-amber-500" /><p className="mt-2 text-[11px] font-semibold text-slate-700">The secret to a better brief</p><p className="mt-1.5 text-[10px] leading-5 text-slate-500">Mention who it’s for, what it should do, and anything it absolutely needs to get right.</p></div>
  </aside>
);
