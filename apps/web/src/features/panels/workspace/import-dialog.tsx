"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDropzone } from "@/components/domain/uploads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { exchangeApi } from "@/data/api";
import { useImportPanels } from "@/data/hooks";
import type { ImportResult } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { cn } from "@/lib/utils/cn";

type Stage = "pick" | "preview" | "done";
const MAX_ROWS = 300;
const ACCEPT = [".xlsx", ".csv"];

function Counter({ label, value, tone }: { label: string; value: number; tone?: "danger" | "success" | "info" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("font-tabular text-xl font-semibold", tone === "danger" && value > 0 && "text-danger")}>{value}</div>
    </div>
  );
}

function Inner({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("panels.import");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const importer = useImportPanels();
  const [stage, setStage] = React.useState<Stage>("pick");
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [onlyErrors, setOnlyErrors] = React.useState(true);
  const busy = importer.isPending;

  const errorLabel = (code: string) => {
    if (t.has(`errors.${code}` as never)) return t(`errors.${code}` as never);
    const m = /^(.+)_too_long$/.exec(code);
    if (m) {
      const field = m[1]!;
      return t("errors.tooLong", { field: t.has(`fields.${field}` as never) ? t(`fields.${field}` as never) : field });
    }
    return code;
  };

  const preview = async (f: File) => {
    setFile(f);
    setError(null);
    try {
      const r = await importer.mutateAsync({ file: f, dryRun: true });
      setResult(r);
      setOnlyErrors(r.failed > 0);
      setStage("preview");
    } catch (e) {
      setError(errorText(e));
    }
  };

  const commit = async () => {
    if (!file) return;
    try {
      const r = await importer.mutateAsync({ file, dryRun: false });
      setResult(r);
      setStage("done");
      toast.success(t("success", { created: r.created, updated: r.updated }));
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const reset = () => {
    setStage("pick");
    setFile(null);
    setResult(null);
    setError(null);
  };

  const steps: Stage[] = ["pick", "preview", "done"];
  const rows = result ? (onlyErrors ? result.rows.filter((r) => r.action === "error") : result.rows) : [];
  const canCommit = !!result && result.failed === 0 && result.created + result.updated > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onOpenChange(false)}>
      <DialogContent
        size="xl"
        title={t("title")}
        description={t("description")}
        closeLabel={tc("actions.close")}
        footer={
          stage === "done" ? (
            <Button variant="primary" onClick={() => onOpenChange(false)}>{tc("actions.done")}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => (stage === "preview" ? reset() : onOpenChange(false))} disabled={busy}>
                {stage === "preview" ? t("chooseAnother") : tc("actions.cancel")}
              </Button>
              {stage === "preview" && (
                <Button variant="primary" disabled={!canCommit} loading={busy} onClick={commit}>
                  {tc("actions.import")}
                </Button>
              )}
            </>
          )
        }
      >
        <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t("steps.label")}>
          {steps.map((s, i) => (
            <li key={s} aria-current={stage === s ? "step" : undefined} className={cn("flex items-center gap-1.5", stage === s ? "font-semibold text-foreground" : "text-subtle")}>
              <span className={cn("grid size-5 place-items-center rounded-full text-2xs", stage === s ? "bg-primary text-primary-foreground" : "bg-surface-3")}>{i + 1}</span>
              {t(`steps.${s}`)}
            </li>
          ))}
        </ol>

        {stage === "pick" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-surface-2/50 p-3 text-sm">
              <p className="font-medium">{t("formatTitle")}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted">
                <li>{t("formatRequired")}</li>
                <li>{t("formatMatch")}</li>
                <li>{t("formatLimits")}</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a href={exchangeApi.templateUrl("xlsx")} download>
                    <FileSpreadsheet />
                    {t("templateXlsx")}
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={exchangeApi.templateUrl("csv")} download>
                    {t("templateCsv")}
                  </a>
                </Button>
              </div>
            </div>
            <FileDropzone accept={ACCEPT} maxMb={5} disabled={busy} onFile={(f) => void preview(f)} hint={t("dropHint")} />
            {busy && <p className="text-sm text-muted" role="status">{t("checking")}</p>}
            {error && (
              <p role="alert" className="rounded border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}
          </div>
        )}

        {stage !== "pick" && result && (
          <div className="flex flex-col gap-4">
            {stage === "done" ? (
              <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success-soft p-3 text-sm text-success">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p>{t("success", { created: result.created, updated: result.updated })}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">{file?.name}</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Counter label={t("toCreate")} value={result.created} />
              <Counter label={t("toUpdate")} value={result.updated} />
              <Counter label={t("failed")} value={result.failed} tone="danger" />
            </div>
            {stage === "preview" && (result.unknown_columns?.length ?? 0) > 0 && (
              <p className="flex items-start gap-2 rounded border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t("unknownColumns", { columns: (result.unknown_columns ?? []).join(", ") })}
              </p>
            )}
            {stage === "preview" && result.failed > 0 && <p className="text-sm text-danger">{t("fixErrors")}</p>}
            {stage === "preview" && (
              <>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox id="import-only-errors" checked={onlyErrors} onCheckedChange={(v) => setOnlyErrors(v === true)} />
                    <label htmlFor="import-only-errors">{t("onlyErrors")}</label>
                  </div>
                )}
                <div className="max-h-72 overflow-y-auto rounded border border-border">
                  <Table>
                    <THead>
                      <tr>
                        <Th>{t("row")}</Th>
                        <Th>{tc("fields.tag")}</Th>
                        <Th>{tc("fields.name")}</Th>
                        <Th>{tc("fields.serial")}</Th>
                        <Th>{tc("fields.status")}</Th>
                      </tr>
                    </THead>
                    <TBody>
                      {rows.slice(0, MAX_ROWS).map((r) => (
                        <Tr key={r.row}>
                          <Td className="font-tabular text-muted">{r.row}</Td>
                          <Td className="font-mono text-sm">{r.tag || "—"}</Td>
                          <Td className="max-w-48 truncate">{r.name || "—"}</Td>
                          <Td className="font-mono text-sm">{r.serial || "—"}</Td>
                          <Td className="min-w-40">
                            {r.action === "error" ? (
                              <div className="flex flex-col gap-0.5 py-1">
                                <Badge tone="danger" className="self-start">{t("status.error")}</Badge>
                                {(r.errors ?? []).map((c) => (
                                  <span key={c} className="text-xs text-danger">{errorLabel(c)}</span>
                                ))}
                              </div>
                            ) : (
                              <Badge tone={r.action === "update" ? "info" : "success"}>{t(r.action === "update" ? "status.update" : "status.create")}</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
                {rows.length > MAX_ROWS && <p className="text-xs text-subtle">{t("moreRows", { count: rows.length - MAX_ROWS })}</p>}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Excel / CSV panel import: pick → dry-run preview → commit. */
export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <Inner onOpenChange={onOpenChange} /> : null;
}
