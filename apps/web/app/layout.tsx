import type { Metadata } from "next";
import type { ReactElement } from "react";
import { application } from "@/constants/application";
import type { RootLayoutProps } from "@/types";
import { ThemeProvider } from "@workspace/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: application.name,
  description: application.description
};

const RootLayout = ({ children }: RootLayoutProps): ReactElement => (
  <html lang="en" suppressHydrationWarning>
    <body><ThemeProvider>{children}</ThemeProvider></body>
  </html>
);

export default RootLayout;
