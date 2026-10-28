import { ArrowUp, LoaderCircle, Square } from "lucide-react";
import { useEffect, useRef, type ReactElement } from "react";
import { Button, Label, Textarea } from "@workspace/ui/primitives";
import { ProjectSettings } from "./project-settings";
import type { usePlanningChat } from "./use-planning-chat";

type PlanningComposerProps = Readonly<{
  chat: ReturnType<typeof usePlanningChat>;
  onResize: (height: number) => void;
}>;

export const PlanningComposer = ({ chat, onResize }: PlanningComposerProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => onResize(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [onResize]);
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [chat.requirement]);

  return (
    <div ref={root} className="studio-composer absolute inset-x-3 bottom-3 z-20 mx-auto max-w-4xl sm:inset-x-6 sm:bottom-5 lg:inset-x-8">
      <form className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.16)] backdrop-blur-xl transition focus-within:border-violet-300 sm:p-3.5" onSubmit={(event) => void chat.handleSubmit(event)}>
        <Label className="sr-only" htmlFor="requirement-message">Message your planning partner</Label>
        <Textarea ref={input} className="max-h-40 min-h-10 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1.5 text-sm leading-6 text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-0" id="requirement-message" maxLength={12_000} minLength={1} onChange={(event) => chat.setRequirement(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }} placeholder="Describe what you want to build…" required rows={1} value={chat.requirement} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">{chat.projectId === null && <ProjectSettings projectName={chat.projectName} setProjectName={chat.setProjectName} context={chat.context} setContext={chat.setContext} pending={chat.pending} />}<span className="shrink-0 text-[9px] tabular-nums text-slate-400">{chat.requirement.length.toLocaleString()} / 12,000</span></div>
          {chat.pending ? <Button className="h-9 rounded-xl bg-rose-50 text-xs text-rose-600 hover:bg-rose-100" disabled={!chat.run} onClick={() => void chat.cancelRun()} type="button">{chat.run ? <Square className="size-3" /> : <LoaderCircle className="size-3 animate-spin" />}{chat.run ? "Stop" : "Starting…"}</Button> : <Button aria-label={chat.plan ? "Generate a new plan version" : "Generate plan"} className="h-9 gap-2 rounded-xl bg-slate-950 px-3 text-xs text-white shadow-sm hover:bg-violet-600 disabled:opacity-35" disabled={chat.requirement.trim().length === 0 || chat.projectName.trim().length < 2} type="submit"><span className="hidden sm:inline">Create plan</span><ArrowUp className="size-4" /></Button>}
        </div>
      </form>
      <p className="mt-2 text-center text-[9px] text-slate-400">Enter to send · Shift + Enter for a new line</p>
    </div>
  );
};
