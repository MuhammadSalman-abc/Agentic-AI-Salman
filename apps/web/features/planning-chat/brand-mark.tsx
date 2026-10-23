import type { ReactElement } from "react";
import { MascotMark } from "@workspace/planning-ui";

type BrandMarkProps = Readonly<{ size?: "header" | "sidebar" }>;

export const BrandMark = ({ size = "header" }: BrandMarkProps): ReactElement => (
  <span aria-hidden="true" className={`agentic-brand-mark ${size === "header" ? "size-10 rounded-2xl" : "size-8 rounded-xl"}`}>
    <MascotMark className={size === "header" ? "size-12" : "size-10"} />
  </span>
);
