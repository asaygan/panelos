"use client";

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { RoleBadge } from "@/components/domain/badges";
import { useRoles } from "@/data/hooks";
import type { Permission } from "@/data/types";
import { ROLES } from "./guards";

const PERMISSIONS: Permission[] = [
  "manage_org",
  "manage_users",
  "view_audit",
  "crud_panels",
  "create_revision",
  "approve_revision",
  "upload_pdf",
  "generate_labels",
  "manage_maintenance",
  "manage_issues",
  "report_issue",
  "export_data",
  "scan_qr",
];

export function RolesTab() {
  const t = useTranslations("users.roles");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useRoles();

  if (isLoading) return <Card><SkeletonRows rows={8} /></Card>;
  if (isError || !data)
    return (
      <Card>
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
        />
      </Card>
    );

  const byRole = new Map(data.map((r) => [r.role, r]));
  const has = (role: (typeof ROLES)[number], p: Permission) =>
    byRole.get(role)?.permissions.some((x) => x.key === p) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("intro")}</p>

      <Card className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <Th>{t("permission")}</Th>
              {ROLES.map((r) => (
                <Th key={r} className="text-center">
                  <div className="flex flex-col items-center gap-1 normal-case tracking-normal">
                    <RoleBadge role={r} />
                    <span className="text-xs font-normal text-subtle">
                      {t("members", { count: byRole.get(r)?.member_count ?? 0 })}
                    </span>
                  </div>
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {PERMISSIONS.map((p) => (
              <Tr key={p}>
                <Td className="py-2.5">
                  <p className="text-base font-medium">{t(`permissions.${p}.label`)}</p>
                  <p className="text-sm text-muted">{t(`permissions.${p}.description`)}</p>
                  {p === "approve_revision" && <p className="mt-0.5 text-xs text-subtle">{t("approveNote")}</p>}
                </Td>
                {ROLES.map((r) => (
                  <Td key={r} className="text-center">
                    {has(r, p) ? (
                      <>
                        <Check className="mx-auto size-4 text-success" aria-hidden />
                        <span className="sr-only">{t("allowed")}</span>
                      </>
                    ) : (
                      <>
                        <Minus className="mx-auto size-4 text-border-strong" aria-hidden />
                        <span className="sr-only">{t("notAllowed")}</span>
                      </>
                    )}
                  </Td>
                ))}
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-3 md:hidden">
        {ROLES.map((r) => {
          const granted = PERMISSIONS.filter((p) => has(r, p));
          return (
            <Card key={r}>
              <CardHeader
                title={tc(`roles.${r}`)}
                description={t("members", { count: byRole.get(r)?.member_count ?? 0 })}
              />
              <ul className="flex flex-col gap-2 p-4">
                {granted.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{t(`permissions.${p}.label`)}</p>
                      <p className="text-xs text-muted">{t(`permissions.${p}.description`)}</p>
                      {p === "approve_revision" && <p className="text-xs text-subtle">{t("approveNote")}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
