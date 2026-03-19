import * as React from "react";
import { cn } from "@/lib/utils/helpers";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "purple";

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary/15 text-primary",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-red-500/15 text-red-400",
  outline: "text-foreground border-border",
  success: "border-transparent bg-emerald-500/15 text-emerald-400",
  warning: "border-transparent bg-amber-500/15 text-amber-400",
  info: "border-transparent bg-sky-500/15 text-sky-400",
  purple: "border-transparent bg-violet-500/15 text-violet-400",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
