import { ArrowUpRight, CalendarDays, ShoppingBag, Sparkles, Workflow } from "lucide-react";
import type { ReactElement } from "react";
import { MascotMark } from "@workspace/planning-ui";

const startingPoints = [
  { icon: ShoppingBag, label: "Commerce", title: "Online store", text: "Build an online store where customers browse products, manage a cart, and place orders. Include stock availability and order confirmation.", tone: "bg-violet-50 text-violet-600" },
  { icon: CalendarDays, label: "Booking", title: "Booking app", text: "Build a booking app for local fitness classes. Customers can find classes, view availability, reserve a place, and manage their bookings.", tone: "bg-violet-50 text-violet-600" },
  { icon: Workflow, label: "Productivity", title: "Project tracker", text: "Build a freelance project tracker where I can create projects, organize tasks by status, set deadlines, and save my progress between visits.", tone: "bg-violet-50 text-violet-600" }
] as const;

export const StudioWelcome = ({ onChoose }: Readonly<{ onChoose: (text: string) => void }>): ReactElement => (
  <div className="studio-enter mx-auto my-auto flex w-full max-w-3xl shrink-0 flex-col items-center py-3 text-center sm:py-4">
    <div className="studio-welcome-mascot relative mb-4 flex size-20 items-center justify-center sm:size-24">
      <MascotMark className="relative z-10 size-16 rounded-2xl shadow-sm sm:size-20 sm:rounded-[1.4rem]" />
    </div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-violet-600">Your planning partner</p>
    <h2 className="mt-3 max-w-xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.045em] text-slate-950 sm:text-[2.5rem]">A spark of an idea.<br /><span className="studio-gradient-text">A clear path to build.</span></h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Tell me what you want to build. Let’s turn your idea into clear features, stories, and tasks.</p>

    <div className="mb-3 mt-5 flex items-center gap-2"><Sparkles className="size-3 text-violet-400" /><p className="text-[10px] font-medium text-slate-400">Or start with a little inspiration</p></div>
    <div className="grid w-full max-w-xl grid-cols-3 gap-2">{startingPoints.map(({ icon: Icon, label, title, text }) => <button aria-label={`Try ${label.toLowerCase()} idea: ${title}`} key={label} className="studio-starter group flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-3 text-left focus-visible:outline-2 focus-visible:outline-violet-500 sm:px-4" onClick={() => onChoose(text)} type="button"><Icon className="size-3.5 shrink-0 text-violet-500" /><span className="text-[10px] font-medium leading-4 text-slate-600 sm:text-xs">{title}</span><ArrowUpRight className="hidden size-3 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" /></button>)}</div>
  </div>
);
