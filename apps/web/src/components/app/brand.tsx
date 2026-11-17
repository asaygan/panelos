import { cn } from "@/lib/utils/cn";

/** PanelOS mark: an enclosure with a live conductor. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M13 7 9.5 12.5h4L11 17.5" />
      </svg>
    </span>
  );
}

export function Brand({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && <span className="text-lg font-semibold tracking-tight">PanelOS</span>}
    </span>
  );
}
