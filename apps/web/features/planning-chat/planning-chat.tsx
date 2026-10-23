"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, CircleAlert, ClipboardList, History, LoaderCircle,
  MessageSquareText, Send, Sparkles, Square, UserRound
} from "lucide-react";
import { Button, Card, CardContent, Label, Textarea } from "@workspace/ui/primitives";
import { AssistantAvatar, PlanResult, ProjectSetup, SavedPlans, Suggestion, WorkflowStep } from "@workspace/planning-ui";
import { BrandMark } from "./brand-mark";
import { usePlanningChat } from "./use-planning-chat";

type PlanningChatProps = Readonly<{ apiBaseUrl: string }>;

const PlanningChat = ({ apiBaseUrl }: PlanningChatProps): ReactElement => {
  const {
    projectName, setProjectName, context, setContext, requirement, setRequirement, projectId,
    activeVersion, savedProjects, versionsByProject, expandedHistoryProject, historyOpen,
    setHistoryOpen, openSavedPlans, historyLoading, historyError, messages, run, plan, savedPlanPreview, acceptedVersion,
    accepting, error, pending, loadProjectVersions, deleteSavedVersion, openSavedVersion, handleSubmit,
    acceptPlan, cancelRun, stageLabels, statusOrder
  } = usePlanningChat(apiBaseUrl);

  return (
    <main className="relative isolate flex h-svh flex-col overflow-hidden bg-transparent font-sans text-slate-900">
      <header className="sticky top-0 z-30 shrink-0 border-b border-white/70 bg-white/75 shadow-sm shadow-indigo-950/[0.03] backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild className="size-9 shrink-0 rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-700" size="icon" variant="ghost">
              <Link aria-label="Back to home" href="/"><ArrowLeft aria-hidden="true" /></Link>
            </Button>
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-slate-950">Agentic<span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-transparent">AI</span> <span className="font-medium text-slate-400">/ Planning studio</span></p>
              <p className="text-[11px] text-slate-500">Turn a rough idea into a clear blueprint</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-violet-200/80 bg-gradient-to-r from-violet-50 to-sky-50 px-3 py-1.5 text-xs font-semibold text-violet-800 sm:inline-flex"><Sparkles aria-hidden="true" className="size-3.5" /> Planning studio</span>
          </div>
        </div>
      </header>

      <nav aria-label="Planning navigation" className="flex shrink-0 gap-2 border-b border-white/70 bg-white/45 px-4 py-2 backdrop-blur-sm lg:hidden">
        <Button aria-current={!historyOpen ? "page" : undefined} className={!historyOpen ? "flex-1 rounded-xl bg-violet-100 text-violet-800" : "flex-1 rounded-xl text-slate-600"} onClick={() => setHistoryOpen(false)} size="sm" type="button"><MessageSquareText aria-hidden="true" className="size-3.5" />Chat</Button>
        <Button aria-current={historyOpen ? "page" : undefined} className={historyOpen ? "flex-1 rounded-xl bg-violet-100 text-violet-800" : "flex-1 rounded-xl text-slate-600"} onClick={() => void openSavedPlans()} size="sm" type="button"><History aria-hidden="true" className="size-3.5" />Saved plans{savedProjects.length > 0 && <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-violet-800">{savedProjects.length}</span>}</Button>
      </nav>

      {!historyOpen && <nav aria-label="Planning steps" className="shrink-0 border-b border-white/70 bg-white/35 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-violet-100/80 bg-white/75 px-2.5 py-2"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><MessageSquareText aria-hidden="true" className="size-3.5" /></span><span className="text-[10px] font-semibold leading-tight text-slate-700">Share<br />your idea</span></div>
          <div className="flex items-center gap-2 rounded-xl border border-sky-100/80 bg-white/75 px-2.5 py-2"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Sparkles aria-hidden="true" className="size-3.5" /></span><span className="text-[10px] font-semibold leading-tight text-slate-700">Shape<br />a plan</span></div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100/80 bg-white/75 px-2.5 py-2"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><ClipboardList aria-hidden="true" className="size-3.5" /></span><span className="text-[10px] font-semibold leading-tight text-slate-700">Review<br />together</span></div>
        </div>
      </nav>}

      <div className={`relative grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden ${historyOpen ? "lg:grid-cols-[14rem_minmax(0,1fr)]" : "lg:grid-cols-[14rem_minmax(0,1fr)_18rem]"}`}>
        <aside aria-label="Workspace sidebar" className="hidden min-h-0 flex-col border-r border-white/70 bg-white/40 p-4 backdrop-blur-sm lg:flex">
          <div className="mb-6 flex items-center gap-2 px-2 pt-1">
            <BrandMark size="sidebar" />
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Workspace</p><p className="text-xs font-semibold text-slate-800">Planning studio</p></div>
          </div>
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Navigate</p>
          <div className="space-y-1.5">
            <button aria-current={!historyOpen ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${!historyOpen ? "bg-gradient-to-r from-violet-100 to-sky-50 text-violet-800 shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-violet-700"}`} onClick={() => setHistoryOpen(false)} type="button"><span className={`flex size-8 items-center justify-center rounded-lg ${!historyOpen ? "bg-white text-violet-700 shadow-sm" : "bg-white/70 text-slate-500"}`}><MessageSquareText aria-hidden="true" className="size-4" /></span><span className="flex-1">Planning chat</span>{!historyOpen && <span className="size-1.5 rounded-full bg-violet-500" />}</button>
            <button aria-current={historyOpen ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${historyOpen ? "bg-gradient-to-r from-violet-100 to-sky-50 text-violet-800 shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-violet-700"}`} onClick={() => void openSavedPlans()} type="button"><span className={`flex size-8 items-center justify-center rounded-lg ${historyOpen ? "bg-white text-violet-700 shadow-sm" : "bg-white/70 text-slate-500"}`}><History aria-hidden="true" className="size-4" /></span><span className="flex-1">Saved plans</span>{savedProjects.length > 0 && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-violet-700 shadow-sm">{savedProjects.length}</span>}</button>
          </div>
          <div className="mt-auto rounded-2xl border border-white/90 bg-gradient-to-br from-white/90 via-violet-50/80 to-sky-50/90 p-3 shadow-sm shadow-indigo-950/[0.04]">
            <Sparkles aria-hidden="true" className="size-4 text-violet-600" />
            <p className="mt-2 text-xs font-bold text-slate-800">Your ideas, organized</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Keep project plans and versions together in one place.</p>
          </div>
        </aside>
        <section aria-label={historyOpen ? "Saved plans" : "Planning conversation"} className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-indigo-100/80 lg:border-r">
          {historyOpen ? <div className="planning-chat-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            <SavedPlans
              projects={savedProjects}
              versionsByProject={versionsByProject}
              expandedProjectId={expandedHistoryProject}
              activeProjectId={savedPlanPreview?.projectId ?? null}
              activeVersion={savedPlanPreview?.version ?? null}
              selectedPlan={savedPlanPreview?.plan ?? null}
              accepted={savedPlanPreview?.accepted ?? false}
              accepting={accepting}
              loading={historyLoading}
              error={historyError}
              onToggleProject={(project) => void loadProjectVersions(project)}
              onSelectVersion={(project, version) => void openSavedVersion(project, version)}
              onRemoveVersion={(project, version) => {
                if (window.confirm(`Permanently remove version ${version}? Remaining versions will be renumbered. If this is the accepted plan, acceptance will be cleared.`)) void deleteSavedVersion(project, version);
              }}
              onAccept={() => savedPlanPreview && void acceptPlan({ projectId: savedPlanPreview.projectId, version: savedPlanPreview.version })}
              onClose={() => setHistoryOpen(false)}
            />
          </div> : <>
          <div className="planning-chat-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-7 pb-10 sm:px-8 sm:py-10">
            {messages.length === 0 ? (
              <div className="mx-auto w-full max-w-3xl space-y-7 py-8 sm:py-14">
                <article className="flex max-w-2xl items-start gap-3">
                  <AssistantAvatar />
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-600">Agentic AI <span className="size-1 rounded-full bg-emerald-400" /><span className="font-normal text-slate-400">Your planning partner</span></p>
                    <div className="rounded-2xl rounded-tl-sm border border-white bg-white/90 px-4 py-4 shadow-lg shadow-indigo-950/[0.04] sm:px-5">
                      <p className="text-base font-bold tracking-tight text-slate-900">Hi! What would you like to build?</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">Tell me who it’s for and what it should do. I’ll organize your idea into features, user stories, and actionable tasks.</p>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-600"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Features</span><span aria-hidden="true" className="self-center text-slate-300">→</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">Stories</span><span aria-hidden="true" className="self-center text-slate-300">→</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Tasks</span></div>
                    </div>
                  </div>
                </article>
                <div className="ml-0 space-y-3 sm:ml-11">
                  <p className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-500"><Sparkles aria-hidden="true" className="size-3.5 text-violet-500" /> Need an idea to start with?</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Suggestion text="A booking platform for local fitness classes" onChoose={setRequirement} />
                    <Suggestion text="A simple app to manage freelance projects and invoices" onChoose={setRequirement} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message) => (
                  <article className={`flex items-end gap-2.5 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                    {message.role === "assistant" && <AssistantAvatar />}
                    <div className={`flex min-w-0 max-w-[88%] flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                      <p className={`mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold ${message.role === "user" ? "text-violet-700" : "text-slate-500"}`}>{message.role === "user" ? "You" : "Agentic AI"}<span aria-hidden="true" className="size-1 rounded-full bg-emerald-400" /><span className="font-normal text-slate-400">{message.role === "user" ? "Your brief" : "Planning partner"}</span></p>
                      <div className={message.role === "user" ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-violet-500/15 ring-1 ring-white/20" : "rounded-2xl rounded-tl-sm border border-white bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700 shadow-md shadow-indigo-950/[0.04]"}>{message.text}</div>
                    </div>
                    {message.role === "user" && <span aria-hidden="true" className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700"><UserRound className="size-4" /></span>}
                  </article>
                ))}
                {pending && run && <article className="flex items-end gap-2.5 sm:gap-3"><AssistantAvatar thinking /><div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white bg-white/95 px-4 py-3.5 shadow-lg shadow-indigo-950/[0.04]"><p className="mb-1 text-[10px] font-semibold text-slate-500">Agentic AI <span className="ml-1 font-normal text-violet-600">is working</span></p><p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><LoaderCircle aria-hidden="true" className="size-4 animate-spin text-violet-600" />{stageLabels[run.status]}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 transition-all duration-700" style={{ width: `${Math.max(8, ((statusOrder.indexOf(run.status) + 1) / statusOrder.length) * 100)}%` }} /></div><ol aria-label="Generation progress" className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">{statusOrder.slice(0, -1).map((stage) => { const currentIndex = statusOrder.indexOf(run.status); const stageIndex = statusOrder.indexOf(stage); const complete = currentIndex > stageIndex; const active = run.status === stage; return <li className={`inline-flex items-center gap-1 text-[10px] ${active ? "font-semibold text-violet-700" : complete ? "text-emerald-700" : "text-slate-400"}`} key={stage}>{complete ? <Check className="size-3" /> : <span className={`size-1.5 rounded-full ${active ? "bg-violet-600" : "bg-slate-300"}`} />}{stage}</li>; })}</ol></div></article>}
                {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{error}</div>}
                {plan && <PlanResult plan={plan} accepting={accepting} accepted={acceptedVersion === activeVersion} onAccept={() => void acceptPlan()} version={activeVersion} />}
              </div>
            )}

            <div aria-hidden="true" className="h-[25svh] shrink-0" />
          </div>

          <div className="absolute bottom-5 left-4 right-4 z-20 mx-auto w-auto max-w-5xl sm:left-8 sm:right-8">
            {projectId === null && <ProjectSetup projectName={projectName} setProjectName={setProjectName} context={context} setContext={setContext} />}
            <form className="relative rounded-[1.6rem] border border-violet-200/80 bg-gradient-to-br from-violet-50 via-[#f8f7ff] to-sky-50 p-2.5 shadow-xl shadow-indigo-950/[0.07] backdrop-blur-md transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100/80 sm:p-3" onSubmit={(event) => void handleSubmit(event)}>
              <Label className="sr-only" htmlFor="requirement-message">Message your planning partner</Label>
              <Textarea className="max-h-36 min-h-12 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2 text-sm leading-6 shadow-none placeholder:text-slate-400 focus-visible:ring-0" id="requirement-message" maxLength={12_000} minLength={1} onChange={(event) => setRequirement(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }} placeholder="Message your planning partner…" required rows={1} value={requirement} />
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
                <span className="inline-flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 sm:text-[11px]"><ClipboardList aria-hidden="true" className="size-3.5 text-violet-500" /><span>Draft until accepted</span><span aria-hidden="true" className="text-slate-300">·</span><span>Plans need 20+ chars</span><span aria-hidden="true" className="text-slate-300">·</span><span className={`tabular-nums ${requirement.length >= 12_000 ? "font-semibold text-amber-600" : "text-slate-400"}`}>{requirement.length.toLocaleString()} / 12,000</span></span>
                {pending ? (
                  <Button className="rounded-xl bg-rose-600 text-white hover:bg-rose-700" disabled={!run} onClick={() => void cancelRun()} size="sm" type="button">{run ? <Square aria-hidden="true" className="size-3" /> : <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />}{run ? "Stop" : "Starting…"}</Button>
                ) : (
                  <Button aria-label={plan ? "Regenerate plan" : "Generate plan"} className="size-10 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg disabled:translate-y-0 disabled:opacity-45" disabled={requirement.trim().length === 0 || projectName.trim().length < 2} size="icon" title={plan ? "Regenerate plan" : "Generate plan"} type="submit"><Send aria-hidden="true" className="size-4" /></Button>
                )}
              </div>
            </form>
          </div>
          </>}

        </section>

        {!historyOpen && <aside aria-label="How planning works" className="hidden min-h-0 overflow-y-auto border-l border-white/70 bg-white/35 px-5 py-8 backdrop-blur-sm lg:block">
          <div className="sticky top-8 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Your workflow</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">From brief to blueprint</h2>
            </div>
            <div className="space-y-3">
              <WorkflowStep number="01" title="Share your brief" detail="Describe the product and its goals." icon={<MessageSquareText className="size-4" />} tone="bg-violet-100 text-violet-700" />
              <WorkflowStep number="02" title="AI shapes a plan" detail="Requirements become features, stories, and tasks." icon={<Sparkles className="size-4" />} tone="bg-sky-100 text-sky-700" />
              <WorkflowStep number="03" title="Review together" detail="Check the hierarchy and decide what to keep." icon={<ClipboardList className="size-4" />} tone="bg-emerald-100 text-emerald-700" />
            </div>
            <Card className="overflow-hidden rounded-2xl border-white bg-gradient-to-br from-white/95 via-violet-50/90 to-sky-50/90 shadow-lg shadow-indigo-950/[0.04]">
              <CardContent className="p-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"><Sparkles className="size-4" /></div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">A good brief goes a long way</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Mention who it’s for, what problem it solves, and any must-have constraints.</p>
              </CardContent>
            </Card>
            <p className="text-[11px] leading-5 text-slate-400">Current chat flow sends a requirement to the existing planning API. Interactive AI follow-up questions aren’t supported by the API yet.</p>
          </div>
        </aside>}
      </div>
    </main>
  );
};

export { PlanningChat };
