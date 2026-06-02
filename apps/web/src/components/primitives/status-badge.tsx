import { STATUS_META, type PanelStatus } from "@/lib/utils/status";
import { cn } from "@/lib/utils/cn";

export interface StatusBadgeProps {
  status: PanelStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={cn("badge", m.cls)}>
      <span className={cn("dot", m.dot)} />
      {label ?? m.label}
    </span>
  );
}
