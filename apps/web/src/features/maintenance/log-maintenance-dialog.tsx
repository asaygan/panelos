"use client";

export interface LogMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId?: string;
  /** Pre-select the plan this work fulfils. */
  planId?: string;
  /** Link (and optionally resolve) an issue. */
  issueId?: string;
}

/** Record maintenance that was carried out. Without `panelId` the dialog starts with a panel picker. (CONTRACT STUB — replaced by the owning feature.) */
export function LogMaintenanceDialog(props: LogMaintenanceDialogProps) {
  void props;
  return null;
}
