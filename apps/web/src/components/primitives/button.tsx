"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "@/components/icons/icon";

export type BtnVariant = "default" | "primary" | "ghost" | "danger";
export type BtnSize = "sm" | "md";

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  variant?: BtnVariant | "";
  size?: BtnSize | "";
  children?: ReactNode;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { icon, variant = "default", size = "md", className, children, type = "button", ...rest },
  ref,
) {
  const hasChildren = children !== undefined && children !== null && children !== false;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "btn",
        variant && variant !== "default" && `btn-${variant}`,
        size && size !== "md" && `btn-${size}`,
        !hasChildren && icon && "btn-icon",
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 14} />}
      {hasChildren && children}
    </button>
  );
});
