import "./globals.css";
import type { Metadata } from "next";
import { ThemeRoot } from "../components/theme/theme-root";

export const metadata: Metadata = {
  title: "FX Signal Ops",
  description: "Signal, sizing, and alert operations dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeRoot />
        {children}
      </body>
    </html>
  );
}
