"use client";

import { Toaster } from "sonner";
import { ThemeBootstrap } from "./theme-bootstrap";

export function ThemeRoot() {
  return (
    <>
      <ThemeBootstrap />
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}
