"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, CircleAlert, History, LoaderCircle, MessageSquareText, Plus, UserRound } from "lucide-react";
import { Button } from "@workspace/ui/primitives";
import { ThemeToggle } from "@workspace/ui";
import { AssistantAvatar, PlanResult, PlanUsage, SavedPlans } from "@workspace/planning-ui";
import { BrandMark } from "./brand-mark";
import { PlanningComposer } from "./planning-composer";
import { StudioSidebar } from "./studio-sidebar";
import { StudioWelcome } from "./studio-welcome";
import { usePlanningChat } from "./use-planning-chat";

type PlanningChatProps = Readonly<{ apiBaseUrl: string }>;

const PlanningChat = ({ apiBaseUrl }: PlanningChatProps): ReactElement => {
  const chat = usePlanningChat(apiBaseUrl);
  const [composerHeight, setComposerHeight] = useState(220);
  const conversation = useRef<HTMLDivElement>(null);
  const { historyOpen, messages, plan, pending, run, stageLabels, statusOrder } = chat;
  const projectsWithPlans = chat.savedProjects.filter((project) => {
    const versions = chat.versionsByProject[project.id];
    return versions ? versions.length > 0 : typeof project.currentVersion === "number" && project.currentVersion > 0;
  });
  const chatEditTarget = !pending && chat.projectId && chat.activeVersion !== null
    && chat.savedProjects.find(({ id }) => id === chat.projectId)?.currentVersion === chat.activeVersion
    ? { projectId: chat.projectId, version: chat.activeVersion } : null;
  const previewEditTarget = chat.savedPlanPreview ? { projectId: chat.savedPlanPreview.projectId, version: chat.savedPlanPreview.version } : null;
  const focusComposer = (): void => document.getElementById("requirement-message")?.focus();
  const newPlan = (): void => {
    if (pending || chat.savingEdits) return;
    chat.startNewPlan();
    conversation.current?.scrollTo({ top: 0, behavior: "auto" });
  };

  useEffect(() => {
    if (!historyOpen && messages.length === 0) conversation.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [historyOpen, messages.length]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const element = document.getElementById("requirement-message");
        if (element) { event.preventDefault(); element.focus(); }
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return (
    <main className="planning-studio grid h-svh grid-cols-1 overflow-hidden font-sans text-slate-900 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <StudioSidebar historyOpen={historyOpen} pending={pending || chat.savingEdits} projects={projectsWithPlans} onChat={() => chat.setHistoryOpen(false)} onHistory={() => void chat.openSavedPlans()} onNewPlan={newPlan} onProject={(project) => { chat.setHistoryOpen(true); void chat.loadProjectVersions(project); }} />
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 bg-white px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3"><span className="lg:hidden"><BrandMark size="sidebar" /></span><h1 className="truncate text-sm font-semibold text-slate-900">{historyOpen ? "Saved plans" : "Planning studio"}</h1></div>
          <div className="flex shrink-0 items-center gap-2"><Button asChild className="h-8 gap-1.5 rounded-lg text-[11px] text-slate-500" variant="ghost"><Link href="/"><ArrowLeft className="size-3.5" />Home</Link></Button><ThemeToggle /></div>
        </header>
        <nav className="flex shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white px-3 py-2 lg:hidden" aria-label="Planning navigation"><Button variant="ghost" aria-current={!historyOpen ? "page" : undefined} className={`flex-1 rounded-xl text-xs ${!historyOpen ? "bg-violet-50 text-violet-700" : "text-slate-500"}`} onClick={() => chat.setHistoryOpen(false)} type="button"><MessageSquareText />Chat</Button><Button variant="ghost" aria-current={historyOpen ? "page" : undefined} className={`flex-1 rounded-xl text-xs ${historyOpen ? "bg-violet-50 text-violet-700" : "text-slate-500"}`} onClick={() => void chat.openSavedPlans()} type="button"><History />Saved plans</Button><Button variant="outline" aria-label="Start a new plan" className="size-8 rounded-lg" disabled={pending || chat.savingEdits} onClick={newPlan} size="icon" type="button"><Plus /></Button></nav>
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden">
          <section aria-label={historyOpen ? "Saved plans" : "Planning conversation"} className="relative min-h-0 min-w-0 overflow-hidden">
            {historyOpen ? <div className="planning-chat-scroll h-full overflow-y-auto p-4 sm:p-7"><SavedPlans projects={projectsWithPlans} versionsByProject={chat.versionsByProject} expandedProjectId={chat.expandedHistoryProject} activeProjectId={chat.savedPlanPreview?.projectId ?? null} activeVersion={chat.savedPlanPreview?.version ?? null} selectedPlan={chat.savedPlanPreview?.plan ?? null} accepted={chat.savedPlanPreview?.accepted ?? false} accepting={chat.accepting} loading={chat.historyLoading} error={chat.historyError} onToggleProject={(project) => void chat.loadProjectVersions(project)} onSelectVersion={(project, version) => void chat.openSavedVersion(project, version)} onRemoveVersion={(project, version) => {
              if (window.confirm(`Permanently remove version ${version}? Remaining versions will be renumbered. If this is the accepted plan, acceptance will be cleared.`)) void chat.deleteSavedVersion(project, version);
            }} onAccept={() => chat.savedPlanPreview && void chat.acceptPlan({ projectId: chat.savedPlanPreview.projectId, version: chat.savedPlanPreview.version })} onClose={() => chat.setHistoryOpen(false)} onSave={previewEditTarget ? (editedPlan) => chat.saveEditedPlan(previewEditTarget, editedPlan) : undefined} usage={chat.savedPlanPreview?.usage} resultSource={chat.savedPlanPreview?.source} /></div> : <>
              <div ref={conversation} className={`planning-chat-scroll h-full overflow-y-auto overscroll-contain px-4 pt-5 sm:px-7 ${messages.length === 0 ? "flex flex-col" : ""}`} style={{ paddingBottom: messages.length === 0 ? `${String(composerHeight + 32)}px` : `calc(${String(composerHeight + 28)}px + 25svh)` }}>
                {messages.length === 0 ? <StudioWelcome onChoose={(text) => { chat.setRequirement(text); focusComposer(); }} /> : <div className="mx-auto max-w-4xl space-y-7 py-5">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-4"><span className="inline-flex items-center gap-2 text-[10px] font-medium text-slate-500"><span className="size-1.5 rounded-full bg-violet-400" />{chat.projectName}</span><Button variant="ghost" className="h-7 gap-1 rounded-lg text-[10px] text-slate-400 hover:text-violet-600" disabled={pending} onClick={newPlan} type="button">New plan<ArrowUpRight className="size-3" /></Button></div>
                  {messages.map((message) => <article className={`studio-enter flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`} key={message.id}>{message.role === "assistant" ? <AssistantAvatar /> : <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-200/70 text-slate-500"><UserRound className="size-3.5" /></span>}<div className={`max-w-[88%] ${message.role === "user" ? "text-right" : ""}`}><p className="mb-2 px-1 text-[9px] font-medium text-slate-400">{message.role === "user" ? "You · Your brief" : "Agentic AI · Planning partner"}</p><div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "rounded-tr-md bg-slate-950 text-white shadow-md shadow-slate-950/10" : "rounded-tl-md border border-slate-200 bg-white text-slate-600 shadow-sm"}`}>{message.text}</div></div></article>)}
                  {pending && <article className="studio-enter flex gap-3" aria-live="polite"><AssistantAvatar thinking /><div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-violet-100 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><LoaderCircle className="size-4 animate-spin text-violet-500" />{run ? stageLabels[run.status] : "Making room for your next idea…"}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-violet-50"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700" style={{ width: `${run ? Math.max(10, ((statusOrder.indexOf(run.status) + 1) / statusOrder.length) * 100) : 8}%` }} /></div><p className="mt-3 text-[10px] text-slate-400">Good plans take a little thought.</p></div></article>}
                  {plan && <article className="studio-enter flex items-start gap-3"><AssistantAvatar /><div className="min-w-0 flex-1"><p className="mb-2 px-1 text-[9px] font-medium text-slate-400">Agentic AI · Your blueprint</p><PlanResult plan={plan} accepting={chat.accepting} accepted={chat.acceptedVersion === chat.activeVersion} onAccept={() => void chat.acceptPlan()} version={chat.activeVersion} onSave={chatEditTarget ? (editedPlan) => chat.saveEditedPlan(chatEditTarget, editedPlan) : undefined} usage={chat.planUsage} resultSource={chat.resultSource} /></div></article>}
                </div>}
                {chat.error && <div role="alert" className="mx-auto mt-5 flex max-w-4xl items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-6 text-rose-700"><CircleAlert className="mt-1 size-4 shrink-0" />{chat.error}</div>}
                {!pending && !plan && run?.usage && <div className="mx-auto mt-4 max-w-4xl"><PlanUsage usage={run.usage} source="generation" /></div>}
                {!pending && plan && <p className="mx-auto mt-5 flex max-w-4xl items-center justify-center gap-1.5 text-[10px] text-slate-400"><Check className="size-3 text-emerald-500" />Saved to your workspace. Ready when you are.</p>}
              </div>
              <PlanningComposer chat={chat} onResize={setComposerHeight} />
            </>}
          </section>
        </div>
      </div>
    </main>
  );
};

export { PlanningChat };
