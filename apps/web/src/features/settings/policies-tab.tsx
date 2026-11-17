"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/controls";
import { useUpdateCompany } from "@/data/hooks";
import type { Company } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

type PolicyKey = "public_qr_access_enabled" | "require_four_eyes" | "engineer_can_approve";
const POLICIES: PolicyKey[] = ["public_qr_access_enabled", "require_four_eyes", "engineer_can_approve"];

/** Each switch saves on its own; the UI shows the new value at once and rolls back on error. */
export function PoliciesTab({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const t = useTranslations("settings.policies");
  const errorText = useApiError();
  const update = useUpdateCompany();

  const change = (key: PolicyKey, value: boolean) => {
    update.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (e) => toast.error(errorText(e)),
      },
    );
  };

  // While a save is in flight show the requested value; afterwards the server value.
  const pending = update.isPending ? (update.variables as Partial<Record<PolicyKey, boolean>>) : {};

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody className="divide-y divide-border py-1">
        {POLICIES.map((key) => (
          <SwitchRow
            key={key}
            title={t(`${key}.title`)}
            description={t(`${key}.description`)}
            checked={pending[key] ?? company[key]}
            disabled={readOnly || update.isPending}
            onCheckedChange={(v) => change(key, v)}
          />
        ))}
      </CardBody>
    </Card>
  );
}
