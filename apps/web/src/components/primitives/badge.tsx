import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "ok" | "warn" | "fault" | "idle" | "draft" | "accent" | "purple";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "idle", dot, className, children }: BadgeProps) {
  return (
    <span className={cn("badge", `badge-${tone}`, className)}>
      {dot && <span className={cn("dot", `dot-${tone}`)} />}
      {children}
    </span>
  );
}
