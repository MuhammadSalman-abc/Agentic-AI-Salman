import type { ReactElement } from "react";

type MascotMarkProps = Readonly<{ className?: string; mood?: "idle" | "thinking" }>;

/** Displays the original Agentic AI mascot artwork with a lightweight motion state. */
export const MascotMark = ({ className = "", mood = "idle" }: MascotMarkProps): ReactElement => (
  <span aria-hidden="true" className={`agentic-mascot ${mood === "thinking" ? "mascot-thinking" : ""} ${className}`}>
    <span className="mascot-eyes-open" />
  </span>
);
