"use client";

import type { Panel } from "@/data/types";

export interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panel: Panel;
}

/** Preview + export the QR label of one panel. (CONTRACT STUB — replaced by the owning feature.) */
export function LabelDialog(props: LabelDialogProps) {
  void props;
  return null;
}
