import type { ReactElement } from "react";
import { Database, Globe2, Server, type LucideIcon } from "lucide-react";

type WorkspaceRuntime = Readonly<{
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
  iconTone: string;
}>;

const runtimes: readonly WorkspaceRuntime[] = [
  { label: "Web experience", detail: "Next.js 16 · React 19", icon: Globe2, tone: "from-violet-50 to-white", iconTone: "bg-violet-100 text-violet-700" },
  { label: "API services", detail: "Express 5 · TypeScript", icon: Server, tone: "from-sky-50 to-white", iconTone: "bg-sky-100 text-sky-700" },
  { label: "Data layer", detail: "MongoDB · Mongoose", icon: Database, tone: "from-emerald-50 to-white", iconTone: "bg-emerald-100 text-emerald-700" }
];

export const RuntimeFoundation = (): ReactElement => (
  <section aria-labelledby="foundation-heading" className="py-8 sm:py-10">
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">The foundation</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900" id="foundation-heading">Everything working together.</h2>
      </div>
      <span className="hidden text-xs font-medium text-slate-500 sm:inline-flex">The stack behind your workspace</span>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {runtimes.map(({ label, detail, icon: Icon, tone, iconTone }) => (
        <article className={`rounded-2xl border border-white bg-gradient-to-br ${tone} p-4 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`} key={label}>
          <div className="flex items-start justify-between">
            <span className={`flex size-10 items-center justify-center rounded-xl ${iconTone}`}><Icon aria-hidden="true" className="size-5" /></span>
            <span className="mt-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-slate-500">{label.startsWith("Web") ? "Frontend" : label.startsWith("API") ? "Backend" : "Storage"}</span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </article>
      ))}
    </div>
  </section>
);
