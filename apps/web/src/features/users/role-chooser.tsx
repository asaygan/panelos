"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/data/types";
import { ROLES } from "./guards";

/** Radio list of roles, each with its one-line description. */
export function RoleChooser({
  value,
  onChange,
  disabledRoles = [],
  name,
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabledRoles?: Role[];
  name: string;
}) {
  const tr = useTranslations("common.roles");
  const t = useTranslations("users.roleDescriptions");
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {ROLES.map((r) => {
        const disabled = disabledRoles.includes(r);
        return (
          <label
            key={r}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
              value === r ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
              disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={r}
              checked={value === r}
              disabled={disabled}
              onChange={() => onChange(r)}
              className="mt-1 sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                value === r ? "border-primary" : "border-border-strong",
              )}
            >
              {value === r && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-medium">{tr(r)}</span>
              <span className="block text-sm text-muted">{t(r)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
