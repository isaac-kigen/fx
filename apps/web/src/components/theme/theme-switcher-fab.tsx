"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/cn";

type ThemeMode = "light" | "dark" | "system";

const modeKey = "fx_theme_mode";
const colorKey = "fx_theme_primary";

const colors = [
  "#22c55e", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#14b8a6", "#0ea5e9", "#4f46e5", "#64748b"
];

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  root.dataset.theme = resolved;
};

const applyPrimary = (color: string) => {
  document.documentElement.style.setProperty("--primary", color);
};

export function ThemeSwitcherFab() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [primary, setPrimary] = useState(colors[0]);

  useEffect(() => {
    const savedMode = localStorage.getItem(modeKey) as ThemeMode | null;
    const savedPrimary = localStorage.getItem(colorKey);
    const nextMode: ThemeMode = savedMode === "dark" || savedMode === "light" || savedMode === "system" ? savedMode : "system";
    const nextPrimary = savedPrimary && colors.includes(savedPrimary) ? savedPrimary : colors[0];

    setMode(nextMode);
    setPrimary(nextPrimary);
    applyTheme(nextMode);
    applyPrimary(nextPrimary);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const currentMode = (localStorage.getItem(modeKey) as ThemeMode | null) ?? "system";
      if (currentMode === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const modeButtons = useMemo(
    () => [
      { id: "light" as const, label: "Light", icon: Sun },
      { id: "dark" as const, label: "Dark", icon: Moon },
      { id: "system" as const, label: "System", icon: Monitor }
    ],
    []
  );

  return (
    <div className="theme-fab-wrap">
      {open ? (
        <div className="theme-panel">
          <div className="theme-panel-head">
            <Palette size={16} />
            <span>Theme</span>
          </div>
          <div className="theme-mode-grid">
            {modeButtons.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn("theme-mode-btn", mode === item.id && "theme-mode-btn-active")}
                  onClick={() => {
                    setMode(item.id);
                    localStorage.setItem(modeKey, item.id);
                    applyTheme(item.id);
                  }}
                >
                  <Icon size={14} /> {item.label}
                </button>
              );
            })}
          </div>
          <div className="theme-color-grid">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn("color-box", primary === color && "color-box-active")}
                style={{ backgroundColor: color }}
                aria-label={`Use ${color}`}
                onClick={() => {
                  setPrimary(color);
                  localStorage.setItem(colorKey, color);
                  applyPrimary(color);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <Button className="theme-fab" onClick={() => setOpen((prev) => !prev)}>
        <Palette size={18} />
      </Button>
    </div>
  );
}
