import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "ui-button",
        variant === "outline" && "ui-button-outline",
        variant === "ghost" && "ui-button-ghost",
        className
      )}
      {...props}
    />
  );
}
