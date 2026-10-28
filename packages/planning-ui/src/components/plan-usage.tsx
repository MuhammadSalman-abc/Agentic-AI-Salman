import { Database, Gauge, Pencil } from "lucide-react";
import type { ReactElement } from "react";
import type { PlanningTokenUsage } from "@workspace/types";

export type PlanUsageProps = Readonly<{ usage?: PlanningTokenUsage | null | undefined; source: "generation" | "database" | "user-edit" }>;
const count = (value: number | null | undefined): string => value === null || value === undefined ? "Unavailable" : value.toLocaleString();

export const PlanUsage = ({ usage, source }: PlanUsageProps): ReactElement => (
  <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-[10px] text-slate-500">
    <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-600">{source === "database" ? <Database className="size-3" /> : source === "user-edit" ? <Pencil className="size-3" /> : <Gauge className="size-3" />}{source === "database" ? "Loaded from saved plans · 0 new AI tokens" : source === "user-edit" ? "Manual edit · 0 AI tokens" : "Generation token usage"}</p>
    {source !== "user-edit" && <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1" title="Counts reported by the provider. Total may include reasoning tokens beyond the visible output.">{source === "database" && <span className="w-full text-[9px] text-slate-400">Original generation</span>}<span>Input <strong className="ml-1 font-semibold tabular-nums text-slate-700">{count(usage?.inputTokens)}</strong></span><span>Output <strong className="ml-1 font-semibold tabular-nums text-slate-700">{count(usage?.outputTokens)}</strong></span><span>Total <strong className="ml-1 font-semibold tabular-nums text-violet-700">{count(usage?.totalTokens)}</strong></span></div>}
  </div>
);
