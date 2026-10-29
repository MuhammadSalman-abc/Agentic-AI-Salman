import type { ReactElement } from "react";
import { ArrowUpRight, HeartPulse, Link2 } from "lucide-react";
import { Button } from "@workspace/ui/primitives/button";

type ApiBoundaryProps = Readonly<{ baseUrl: string }>;

export const ApiBoundary = ({ baseUrl }: ApiBoundaryProps): ReactElement => (
  <section aria-label="API connection" className="api-connection-card flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><HeartPulse aria-hidden="true" className="size-5" /></span>
      <div className="min-w-0">
        <h2 className="font-semibold text-slate-900">API connection</h2>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <Link2 aria-hidden="true" className="size-3 shrink-0" />
          <code className="truncate font-mono">{baseUrl}</code>
        </p>
      </div>
    </div>
    <Button asChild className="shrink-0 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50" size="sm" variant="outline">
      <a href={`${baseUrl}/health`} rel="noreferrer" target="_blank">Check API health <ArrowUpRight aria-hidden="true" /></a>
    </Button>
  </section>
);
