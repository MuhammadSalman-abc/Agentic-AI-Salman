"use client";

import { Moon, Sun } from "lucide-react";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import type { ComponentProps, ReactElement } from "react";
import { Button } from "../primitives/index.js";

export const ThemeProvider = ({ children }: Pick<ComponentProps<typeof NextThemeProvider>, "children">): ReactElement => (
  <NextThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="agentic-theme">{children}</NextThemeProvider>
);

export const ThemeToggle = (): ReactElement => {
  const { setTheme } = useTheme();
  return <Button aria-label="Toggle light and dark mode" className="size-8 rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300" onClick={() => {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }} size="icon" title="Toggle light and dark mode" type="button" variant="ghost"><Moon aria-hidden="true" className="size-4 dark:hidden" /><Sun aria-hidden="true" className="hidden size-4 dark:block" /></Button>;
};
