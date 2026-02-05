"use client";

import { useEffect } from "react";

export function ThemeBootstrap() {
  useEffect(() => {
    const mode = localStorage.getItem("fx_theme_mode") ?? "system";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
    document.documentElement.dataset.theme = resolved;

    const primary = localStorage.getItem("fx_theme_primary") ?? "#22c55e";
    document.documentElement.style.setProperty("--primary", primary);
  }, []);

  return null;
}
