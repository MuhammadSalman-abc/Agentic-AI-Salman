import { Settings2 } from "lucide-react";
import { useState, type ReactElement } from "react";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/primitives";
import type { usePlanningChat } from "./use-planning-chat";

type ProjectSettingsProps = Readonly<Pick<ReturnType<typeof usePlanningChat>, "projectName" | "setProjectName" | "context" | "setContext" | "pending">>;

export const ProjectSettings = ({ projectName, setProjectName, context, setContext, pending }: ProjectSettingsProps): ReactElement => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button aria-label="Project settings" className="h-7 max-w-48 gap-1.5 rounded-lg px-2 text-[10px] text-slate-500 hover:bg-violet-50 hover:text-violet-700" disabled={pending} title="Project settings" type="button" variant="ghost"><Settings2 className="size-3.5" /><span className="truncate">{projectName.trim() || "Project settings"}</span></Button></PopoverTrigger>
      <PopoverContent align="start" side="top" sideOffset={12} className="w-80 max-w-[calc(100vw-2rem)] space-y-4 rounded-2xl border-slate-200 bg-white p-4 shadow-lg">
        <div><h2 className="text-sm font-semibold text-slate-900">Project settings</h2><p className="mt-1 text-xs text-slate-500">Give your idea a name and a little context.</p></div>
        <div className="space-y-1.5"><Label className="text-xs" htmlFor="studio-project-name">Project name</Label><Input aria-invalid={projectName.trim().length < 2} className="h-9 rounded-lg text-sm" id="studio-project-name" maxLength={100} minLength={2} onChange={(event) => setProjectName(event.target.value)} value={projectName} />{projectName.trim().length < 2 && <p className="text-[11px] text-rose-600">Use at least 2 characters.</p>}</div>
        <div className="space-y-1.5"><Label className="text-xs" htmlFor="studio-project-context">Extra context <span className="font-normal text-slate-400">(optional)</span></Label><Input className="h-9 rounded-lg text-sm" id="studio-project-context" maxLength={8_000} onChange={(event) => setContext(event.target.value)} placeholder="Users, stack, constraints…" value={context} /></div>
        <Button className="h-8 w-full rounded-lg bg-slate-950 text-xs text-white hover:bg-violet-600" disabled={projectName.trim().length < 2} onClick={() => setOpen(false)} type="button">Done</Button>
      </PopoverContent>
    </Popover>
  );
};
