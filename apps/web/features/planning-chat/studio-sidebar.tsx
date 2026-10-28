import Link from "next/link";
import { ArrowUpRight, FolderClosed, History, MessageSquareText, Plus } from "lucide-react";
import type { ReactElement } from "react";
import type { PlanningProject } from "@workspace/types";
import { Button } from "@workspace/ui/primitives";
import { BrandMark } from "./brand-mark";

type StudioSidebarProps = Readonly<{
  historyOpen: boolean;
  pending: boolean;
  projects: readonly PlanningProject[];
  onChat: () => void;
  onHistory: () => void;
  onNewPlan: () => void;
  onProject: (project: PlanningProject) => void;
}>;

export const StudioSidebar = ({ historyOpen, pending, projects, onChat, onHistory, onNewPlan, onProject }: StudioSidebarProps): ReactElement => {
  const recentProjects = projects.filter(({ currentVersion }) => typeof currentVersion === "number" && currentVersion > 0).slice(0, 5);
  return (
  <aside className="studio-sidebar hidden min-h-0 flex-col lg:flex" aria-label="Workspace sidebar">
    <Link href="/" className="flex items-center gap-3 px-2 py-2 text-white"><BrandMark /><span><span className="block text-lg font-bold tracking-tight">Agentic<span className="text-violet-300">AI</span></span><span className="text-[10px] tracking-wide text-slate-400">Ideas into action.</span></span></Link>
    <Button className="studio-new-plan mt-7 h-11 w-full justify-start rounded-xl px-4 text-xs font-semibold" disabled={pending} onClick={onNewPlan} type="button"><Plus className="size-4" />New plan</Button>
    <p className="mb-3 mt-8 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
    <nav aria-label="Planning navigation" className="space-y-1.5">
      <Button aria-current={!historyOpen ? "page" : undefined} className={`studio-nav ${!historyOpen ? "studio-nav-active" : ""}`} onClick={onChat} type="button" variant="ghost"><MessageSquareText className="size-4" /><span>Planning chat</span>{!historyOpen && <span className="ml-auto size-1.5 rounded-full bg-violet-400" />}</Button>
      <Button aria-current={historyOpen ? "page" : undefined} className={`studio-nav ${historyOpen ? "studio-nav-active" : ""}`} onClick={onHistory} type="button" variant="ghost"><History className="size-4" /><span>Saved plans</span><span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[10px]">{projects.length}</span></Button>
    </nav>
    <div className="planning-chat-scroll mt-8 min-h-0 flex-1 overflow-y-auto">
      <div className="mb-3 flex items-center justify-between px-3"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recent projects</p><FolderClosed className="size-3.5 text-slate-500" /></div>
      {recentProjects.map((project) => <button key={project.id} className="group flex w-full items-start gap-2.5 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-violet-400" onClick={() => onProject(project)} type="button"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400" /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-slate-300 group-hover:text-white">{project.name}</span><span className="mt-1 block text-[10px] text-slate-500">Version {project.currentVersion}</span></span><ArrowUpRight className="size-3 text-slate-600 group-hover:text-violet-300" /></button>)}
      {recentProjects.length === 0 && <p className="px-3 text-[11px] leading-5 text-slate-500">Your saved plans will appear here.</p>}
    </div>
  </aside>
  );
};
