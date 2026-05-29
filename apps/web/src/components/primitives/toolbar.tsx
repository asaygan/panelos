import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Toolbar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 mb-3 flex-wrap", className)}
      {...rest}
    />
  );
}
