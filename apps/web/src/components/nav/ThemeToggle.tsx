"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fx_theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = (stored === "light" || stored === "dark") ? stored : "dark";
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return (
    <button type="button" className="secondary" onClick={toggle}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
