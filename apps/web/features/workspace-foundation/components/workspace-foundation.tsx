import type { ReactElement } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowRight, Check, Circle, Sparkles } from "lucide-react";
import { MascotMark } from "@workspace/planning-ui";
import { Button } from "@workspace/ui/primitives/button";
import { ApiBoundary } from "./api-boundary";
import { RuntimeFoundation } from "./runtime-foundation";

type WorkspaceFoundationProps = Readonly<{ apiBaseUrl: string }>;

export const WorkspaceFoundation = ({ apiBaseUrl }: WorkspaceFoundationProps): ReactElement => (
  <main className="workspace-home relative min-h-screen overflow-hidden bg-[#f5f7ff] px-4 py-5 font-sans text-slate-900 sm:px-8 sm:py-8 lg:px-12">
    <div aria-hidden="true" className="pointer-events-none absolute -left-36 top-40 size-96 rounded-full bg-violet-300/30 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 size-[30rem] rounded-full bg-cyan-200/35 blur-3xl" />

    <div className="relative mx-auto max-w-6xl">
      <header className="flex items-center justify-between gap-4 pb-8">
        <Link aria-label="Agentic AI home" className="group flex items-center gap-3" href="/">
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-[#101a43] shadow-lg shadow-indigo-500/25 transition-transform group-hover:-rotate-3">
            <MascotMark className="size-14" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight">Agentic<span className="text-violet-600">AI</span></span>
            <span className="block text-xs font-medium text-slate-500">YOUR PRODUCT STUDIO</span>
          </span>
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-violet-800 shadow-sm backdrop-blur">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Product planning studio
        </div>
      </header>

      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#21144f] via-[#4524a8] to-[#176fa8] px-6 py-9 text-white shadow-2xl shadow-indigo-950/15 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(103,232,249,0.32),transparent_35%),radial-gradient(ellipse_at_12%_105%,rgba(192,132,252,0.35),transparent_45%)]" />
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-80 rounded-full border border-white/10 sm:right-8 sm:top-1/2 sm:-translate-y-1/2">
          <div className="absolute inset-8 rounded-full border border-white/10" />
          <div className="absolute inset-16 rounded-full border border-white/10" />
          <span className="absolute left-10 top-12 flex size-20 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#101a43]/70 shadow-xl backdrop-blur"><MascotMark className="size-24" /></span>
          <span className="absolute bottom-14 right-8 flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-violet-100 shadow-xl backdrop-blur"><Sparkles className="size-5" /></span>
          <span className="absolute right-20 top-14 flex size-8 items-center justify-center rounded-full bg-cyan-300 text-cyan-950 shadow-lg"><Circle className="size-2.5 fill-current" /></span>
        </div>

        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-violet-100 backdrop-blur">
            <Sparkles aria-hidden="true" className="size-3.5 text-cyan-200" />
            FROM IDEA TO CLEAR PLAN
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Big ideas deserve a <span className="bg-gradient-to-r from-cyan-200 via-sky-100 to-violet-200 bg-clip-text text-transparent">brilliant plan.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-indigo-100 sm:text-lg">
            Shape your software vision into thoughtful features, user stories, and tasks—ready for your review.
          </p>
          <Button asChild className="workspace-cta mt-8 h-12 rounded-xl bg-white px-5 text-sm font-bold text-indigo-800 shadow-lg shadow-indigo-950/20 hover:bg-cyan-50" size="lg">
            <Link href="/agentic-ai">Open your AI workspace <ArrowRight aria-hidden="true" /></Link>
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-indigo-200"><Check aria-hidden="true" className="size-3.5" /> AI suggests. You stay in control.</p>
        </div>
        <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-5 text-xs text-indigo-100 sm:mt-12">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/10"><Activity aria-hidden="true" className="size-4 text-cyan-200" /></span>
          <span>Workspace is up and running</span>
          <ArrowDownRight aria-hidden="true" className="ml-auto size-4 text-cyan-200" />
        </div>
      </section>

      <RuntimeFoundation />
      <ApiBoundary baseUrl={apiBaseUrl} />
      <footer className="pt-5 text-center text-xs text-slate-400">Made for turning good ideas into great products.</footer>
    </div>
  </main>
);
