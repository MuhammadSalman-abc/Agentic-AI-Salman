"use client";

import { LoaderCircle, Pencil } from "lucide-react";
import { useState, type ReactElement } from "react";
import type { ArchitecturePlan, PlanFeature } from "@workspace/types";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/primitives";

type EntityKind = "features" | "stories" | "tasks";
type PlanEditorProps = Readonly<{ plan: ArchitecturePlan; version: number; onSave: (plan: ArchitecturePlan) => Promise<void>; disabled?: boolean }>;
type EditableFields = Pick<PlanFeature, "title" | "description" | "priority">;

/** IDs, relationships and criterion positions stay stable while the text is edited. */
export const PlanEditor = ({ plan, version, onSave, disabled = false }: PlanEditorProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(plan);
  const [kind, setKind] = useState<EntityKind>("features");
  const [selectedId, setSelectedId] = useState(plan.features[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entities = draft[kind];
  const entity = entities.find(({ id }) => id === selectedId);
  const criteria = kind === "stories" ? draft.stories.find(({ id }) => id === selectedId)?.acceptanceCriteria
    : kind === "tasks" ? draft.tasks.find(({ id }) => id === selectedId)?.completionCriteria : undefined;
  const changed = JSON.stringify(draft) !== JSON.stringify(plan);

  const updateFields = (patch: Partial<EditableFields>): void => {
    setDraft((current) => ({ ...current, [kind]: current[kind].map((item) => item.id === selectedId ? { ...item, ...patch } : item) }));
  };
  const updateCriterion = (index: number, text: string): void => {
    setDraft((current) => kind === "stories" ? {
      ...current,
      stories: current.stories.map((story) => story.id === selectedId ? { ...story, acceptanceCriteria: story.acceptanceCriteria.map((criterion, position) => position === index ? text : criterion) } : story)
    } : {
      ...current,
      tasks: current.tasks.map((task) => task.id === selectedId ? { ...task, completionCriteria: task.completionCriteria.map((criterion, position) => position === index ? text : criterion) } : task)
    });
  };
  const valid = [...draft.features, ...draft.stories, ...draft.tasks].every((item) => item.title.trim().length > 0 && item.description.trim().length > 0)
    && draft.stories.every((story) => story.acceptanceCriteria.every((criterion) => criterion.trim().length > 0))
    && draft.tasks.every((task) => task.completionCriteria.every((criterion) => criterion.trim().length > 0));

  const save = async (): Promise<void> => {
    if (!changed || !valid || saving) return;
    setSaving(true);
    setError(null);
    try { await onSave(draft); setOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Edits could not be saved. Your draft is still here."); }
    finally { setSaving(false); }
  };

  return <>
    <Button className="rounded-xl border-slate-200 text-xs text-slate-600" disabled={disabled} onClick={() => {
      setDraft(plan); setKind("features"); setSelectedId(plan.features[0]?.id ?? ""); setError(null); setOpen(true);
    }} size="sm" type="button" variant="outline"><Pencil className="size-3.5" />Edit plan</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onInteractOutside={(event) => { event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b border-slate-100 p-5 pr-10"><DialogTitle>Edit your plan</DialogTitle><DialogDescription>Changes to version {version} save as a new version. Editing uses no AI tokens.</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
            <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="space-y-1.5"><Label className="text-xs" htmlFor="edit-plan-kind">Section</Label><Select value={kind} onValueChange={(value) => { const next = value as EntityKind; setKind(next); setSelectedId(draft[next][0]?.id ?? ""); }}><SelectTrigger id="edit-plan-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="features">Features</SelectItem><SelectItem value="stories">User stories</SelectItem><SelectItem value="tasks">Tasks</SelectItem></SelectContent></Select></div>
              <div className="min-w-0 space-y-1.5"><Label className="text-xs" htmlFor="edit-plan-entity">Choose an item</Label><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger className="min-w-0" id="edit-plan-entity"><SelectValue /></SelectTrigger><SelectContent>{entities.map((item) => <SelectItem key={item.id} value={item.id}>{item.id} · {item.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {entity && <>
              <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><div className="space-y-1.5"><Label className="text-xs" htmlFor="edit-plan-title">Title</Label><Input id="edit-plan-title" maxLength={160} onChange={(event) => { updateFields({ title: event.target.value }); }} value={entity.title} /></div><div className="space-y-1.5"><Label className="text-xs" htmlFor="edit-plan-priority">Priority</Label><Select value={entity.priority} onValueChange={(value) => { updateFields({ priority: value as EditableFields["priority"] }); }}><SelectTrigger id="edit-plan-priority"><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="space-y-1.5"><Label className="text-xs" htmlFor="edit-plan-description">Description</Label><Textarea className="min-h-24 resize-y text-sm" id="edit-plan-description" maxLength={2_000} onChange={(event) => { updateFields({ description: event.target.value }); }} value={entity.description} /></div>
              {criteria && <div className="space-y-3"><p className="text-xs font-semibold text-slate-700">{kind === "stories" ? "Acceptance criteria" : "Completion criteria"}</p>{criteria.map((criterion, index) => <div key={`${selectedId}-${String(index)}`} className="space-y-1.5"><Label className="text-[11px] text-slate-500" htmlFor={`edit-plan-criterion-${String(index)}`}>{kind === "stories" ? "AC" : "Criterion"} {index + 1}</Label><Textarea className="min-h-16 text-sm" id={`edit-plan-criterion-${String(index)}`} maxLength={500} onChange={(event) => { updateCriterion(index, event.target.value); }} value={criterion} /></div>)}<p className="text-[10px] text-slate-400">Criterion order and links stay fixed. Review linked tasks when changing expected behavior.</p></div>}
            </>}
          </fieldset>
          {!valid && <p role="status" className="text-xs text-amber-700">Titles, descriptions, and criteria cannot be empty.</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4"><p className="text-[10px] text-slate-400">{changed ? "Unsaved changes" : "No changes yet"}</p><div className="flex gap-2"><Button disabled={saving} onClick={() => { setOpen(false); }} size="sm" type="button" variant="ghost">Cancel</Button><Button className="rounded-lg bg-violet-600 text-white hover:bg-violet-700" disabled={!changed || !valid || saving} onClick={() => void save()} size="sm" type="button">{saving && <LoaderCircle className="size-3 animate-spin" />}{saving ? "Saving…" : "Save new version"}</Button></div></div>
      </DialogContent>
    </Dialog>
  </>;
};
