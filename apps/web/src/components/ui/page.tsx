import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Standard page frame: scrollable content area with consistent gutters. */
export function Page({
  className,
  width = "wide",
  children,
}: {
  className?: string;
  /** "wide" for tables/dashboards, "narrow" for forms/settings. */
  width?: "wide" | "narrow" | "full";
  children: React.ReactNode;
}) {
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6",
          width === "wide" && "max-w-[1400px]",
          width === "narrow" && "max-w-3xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A labelled value in a definition grid (panel details etc). */
export function DataItem({
  label,
  children,
  mono,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-base", mono && "font-mono text-sm")}>
        {children ?? <span className="text-subtle">—</span>}
      </dd>
    </div>
  );
}

/** Headline number with a label and optional trend line (dashboard). */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  children,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success" | "primary";
  /** e.g. a <Sparkline /> */
  children?: React.ReactNode;
  className?: string;
}) {
  const toneClass = {
    neutral: "text-foreground",
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
    primary: "text-primary",
  }[tone];
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted">
        <span className="truncate">{label}</span>
        {icon && <span className="text-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      <div className={cn("font-tabular text-3xl font-semibold", toneClass)}>{value}</div>
      {hint && <div className="text-xs text-subtle">{hint}</div>}
      {children}
    </div>
  );
}

/** Minimal inline trend chart from real data points. Renders nothing for an all-zero series. */
export function Sparkline({
  data,
  className,
  "aria-label": ariaLabel,
}: {
  data: number[];
  className?: string;
  "aria-label"?: string;
}) {
  const max = Math.max(...data, 0);
  if (data.length < 2 || max === 0) return <div className={cn("h-8", className)} />;
  const w = 100;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 2) - 1).toFixed(2)}`);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full text-primary", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <polygon points={`0,${h} ${points.join(" ")} ${w},${h}`} fill="currentColor" opacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
