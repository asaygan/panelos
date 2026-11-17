"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/page";
import { useCompany, usePanels, usePermissions } from "@/data/hooks";
import { companyApi } from "@/data/api";
import { buildLabelData } from "@/lib/api/label-layout";
import { LabelOptions } from "./label-options";
import { LabelPreview } from "./label-preview";
import { PanelSelectList } from "./panel-select-list";
import { usePrintLabels } from "./print-sheet";
import { useChoiceSelection, useLabelChoices } from "./use-label-choices";
import { useLabelData } from "./use-label-data";
import { useLabelExport, type ExportFormat } from "./use-label-export";

/** /labels: pick panels, preview the label, download or print. */
export function LabelsScreen() {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const { can, ready } = usePermissions();

  return (
    <Page>
      <PageHeader title={t("page.title")} description={t("page.description")} />
      {!ready ? (
        <Skeleton className="h-96 w-full" />
      ) : !can("generate_labels") ? (
        <Card>
          <EmptyState
            icon={<Lock />}
            title={t("noPermission.title")}
            description={t("noPermission.body")}
            action={
              <Button asChild variant="secondary">
                <Link href="/panels">{tc("entities.panels")}</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <LabelWorkspace />
      )}
    </Page>
  );
}

function LabelWorkspace() {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const params = useSearchParams();
  const panelsQuery = usePanels();
  const { data: company } = useCompany();
  const { choices, defaultChoice, isLoading, isError, refetch } = useLabelChoices();
  const { choice, setChoiceId } = useChoiceSelection(choices, defaultChoice);

  const panels = React.useMemo(() => panelsQuery.data ?? [], [panelsQuery.data]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const [format, setFormat] = React.useState<ExportFormat>("png");
  const seeded = React.useRef(false);

  // Deep links: ?panel=<id> previews one, ?panels=<id,id,…> preloads a batch.
  React.useEffect(() => {
    if (seeded.current || panels.length === 0) return;
    seeded.current = true;
    const known = new Set(panels.map((p) => p.id));
    const one = params.get("panel");
    const many = (params.get("panels") ?? "").split(",").filter((id) => known.has(id));
    const ids = one && known.has(one) ? [one, ...many.filter((id) => id !== one)] : many;
    if (ids.length > 0) {
      setSelected(ids);
      setFocusedId(ids[0]!);
    }
  }, [panels, params]);

  const byId = React.useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);
  const selectedPanels = React.useMemo(
    () => selected.map((id) => byId.get(id)).filter((p) => p !== undefined),
    [selected, byId],
  );
  const focusId =
    focusedId && byId.has(focusedId) ? focusedId : (selectedPanels[0]?.id ?? null);
  const focused = focusId ? byId.get(focusId) : undefined;
  const focusData = useLabelData(focused);

  const { pending, batch, exportOne, exportBatch, resetBatch } = useLabelExport(choice);
  const { print, node } = usePrintLabels();

  const toggle = (id: string) => {
    resetBatch();
    setSelected((cur) => {
      if (cur.includes(id)) {
        const next = cur.filter((x) => x !== id);
        if (focusId === id) setFocusedId(next[0] ?? null);
        return next;
      }
      if (!focusId) setFocusedId(id);
      return [...cur, id];
    });
  };
  const focusPanel = (id: string) => {
    setFocusedId(id);
    setSelected((cur) => (cur.includes(id) ? cur : [...cur, id]));
    resetBatch();
  };
  const selectMany = (ids: string[]) => {
    resetBatch();
    setSelected((cur) => [...cur, ...ids.filter((id) => !cur.includes(id))]);
    if (!focusId && ids[0]) setFocusedId(ids[0]);
  };
  const clear = () => {
    resetBatch();
    setSelected([]);
    setFocusedId(null);
  };

  const step = (dir: 1 | -1) => {
    if (selectedPanels.length < 2) return;
    const idx = selectedPanels.findIndex((p) => p.id === focusId);
    const next = selectedPanels[(idx + dir + selectedPanels.length) % selectedPanels.length];
    if (next) setFocusedId(next.id);
  };

  const printBatchData = () => {
    if (!choice) return;
    const logoUrl = company?.logo_key ? companyApi.logoUrl(company.logo_key) : null;
    print(
      selectedPanels.map((p) => ({
        layout: choice.layout,
        data: buildLabelData(p, company, { logoUrl }),
      })),
    );
  };

  if (panelsQuery.isLoading || isLoading) return <Skeleton className="h-96 w-full" />;
  if (panelsQuery.isError || isError || !choice) {
    return (
      <Card>
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void panelsQuery.refetch();
                void refetch();
              }}
            >
              {tc("actions.retry")}
            </Button>
          }
        />
      </Card>
    );
  }
  if (panels.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<QrCode />}
          title={t("noPanels.title")}
          description={t("noPanels.body")}
          action={
            <Button asChild>
              <Link href="/panels">{tc("entities.panels")}</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const position = selectedPanels.findIndex((p) => p.id === focusId);

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
        <div className="lg:sticky lg:top-0 lg:max-h-[calc(100dvh-11rem)] lg:min-h-[24rem] lg:[&>div]:max-h-[inherit]">
          <PanelSelectList
            panels={panels}
            selected={selected}
            focusedId={focusId}
            onToggle={toggle}
            onFocus={focusPanel}
            onSelectMany={selectMany}
            onClear={clear}
          />
        </div>

        <Card className="min-w-0">
          <CardHeader
            title={
              focused ? (
                <span className="font-mono text-base">{focused.tag}</span>
              ) : (
                t("preview.title")
              )
            }
            description={focused?.name}
            actions={
              selectedPanels.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("preview.previous")}
                    onClick={() => step(-1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-12 text-center text-xs text-muted">
                    {position + 1} / {selectedPanels.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("preview.next")}
                    onClick={() => step(1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )
            }
          />
          <div className="p-4">
            {focused ? (
              <LabelPreview layout={choice.layout} data={focusData} zoomable />
            ) : (
              <EmptyState
                icon={<QrCode />}
                title={t("preview.emptyTitle")}
                description={t("preview.emptyBody")}
                className="py-16"
              />
            )}
          </div>
        </Card>

        <div className="min-w-0 lg:col-start-2 2xl:col-start-auto">
          <LabelOptions
            choices={choices}
            choice={choice}
            onChoice={(id) => {
              setChoiceId(id);
              resetBatch();
            }}
            format={format}
            onFormat={setFormat}
            hasFocus={!!focused}
            exporting={pending}
            onExportOne={() => focused && void exportOne(focused, format)}
            onPrintOne={() => focused && print([{ layout: choice.layout, data: focusData }])}
            selectedCount={selectedPanels.length}
            batch={batch}
            onExportBatch={() => void exportBatch(selectedPanels)}
            onPrintBatch={printBatchData}
          />
        </div>
      </div>
      {node}
    </>
  );
}
