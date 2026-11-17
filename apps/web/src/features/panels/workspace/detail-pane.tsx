"use client";

import Link from "next/link";
import { Box, ExternalLink, FolderKanban, Layers, Pencil, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { DocStatusBadge, DueBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataItem } from "@/components/ui/page";
import type { PanelNode } from "@/data/types";
import type { IndexEntry } from "./model";
import { CabinetForm, GroupForm, ProjectForm } from "./node-forms";
import { IssueCount, OverdueMark } from "./panel-cells";

function PanelSummary({ panel, canEdit, onEdit }: { panel: PanelNode; canEdit: boolean; onEdit: (p: PanelNode) => void }) {
  const t = useTranslations("panels.detail");
  const tf = useTranslations("common.fields");
  const path = [panel.project_name, panel.group_name].filter(Boolean).join(" › ");
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DataItem label={tf("tag")} mono>{panel.tag}</DataItem>
        <DataItem label={tf("serial")} mono>{panel.serial}</DataItem>
        <DataItem label={tf("name")} className="col-span-2">{panel.name}</DataItem>
        <DataItem label={t("path")} className="col-span-2">{path || null}</DataItem>
        <DataItem label={tf("location")}>{panel.location_name}</DataItem>
        <DataItem label={t("docStatus")}><DocStatusBadge status={panel.doc_status} /></DataItem>
        <DataItem label={t("issues")}>
          {panel.open_issue_count > 0 ? <IssueCount count={panel.open_issue_count} severity={panel.worst_open_severity} /> : null}
        </DataItem>
        <DataItem label={t("nextMaintenance")}>
          {panel.next_maintenance_on ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <DueBadge dueOn={panel.next_maintenance_on} />
              {panel.maintenance_overdue && <OverdueMark />}
            </span>
          ) : null}
        </DataItem>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="primary">
          <Link href={`/panels/${panel.id}`}>
            <ExternalLink />
            {t("openPanel")}
          </Link>
        </Button>
        {canEdit && (
          <Button onClick={() => onEdit(panel)}>
            <Pencil />
            {t("edit")}
          </Button>
        )}
      </div>
    </div>
  );
}

const icons = { project: FolderKanban, group: Layers, panel: Zap, cabinet: Box };

/** Title row + the editor for the selected node. Forms are keyed by node id, so switching nodes resets them. */
export function DetailContent({
  entry,
  canEdit,
  onDirtyChange,
  onEditPanel,
}: {
  entry: IndexEntry;
  canEdit: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onEditPanel: (p: PanelNode) => void;
}) {
  const common = { canEdit, onDirtyChange };
  switch (entry.kind) {
    case "project":
      return <ProjectForm key={entry.node.id} node={entry.node} {...common} />;
    case "group":
      return <GroupForm key={entry.node.id} node={entry.node} {...common} />;
    case "cabinet":
      return <CabinetForm key={entry.node.id} node={entry.node} {...common} />;
    case "panel":
      return <PanelSummary key={entry.node.id} panel={entry.node} canEdit={canEdit} onEdit={onEditPanel} />;
  }
}

export function entryTitle(entry: IndexEntry): string {
  return entry.kind === "panel" ? `${entry.node.tag} · ${entry.node.name}` : entry.node.name;
}

export function KindLabel({ kind }: { kind: IndexEntry["kind"] }) {
  const tc = useTranslations("common.entities");
  const Icon = icons[kind];
  const label = { project: tc("project"), group: tc("systemGroup"), panel: tc("panel"), cabinet: tc("cabinet") }[kind];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle [&_svg]:size-3.5">
      <Icon aria-hidden />
      {label}
    </span>
  );
}

/** Desktop (lg+) side pane. */
export function DetailPane({
  entry,
  onClose,
  ...rest
}: {
  entry: IndexEntry | null;
  canEdit: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onEditPanel: (p: PanelNode) => void;
  onClose: () => void;
}) {
  const t = useTranslations("panels.detail");
  const tc = useTranslations("common.actions");
  return (
    <Card className="sticky top-0 hidden max-h-[calc(100dvh-7rem)] flex-col overflow-hidden lg:flex">
      {entry ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <KindLabel kind={entry.kind} />
              <h2 className="truncate text-lg font-semibold">{entryTitle(entry)}</h2>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={tc("close")} onClick={onClose}>
              <X />
            </Button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <DetailContent entry={entry} {...rest} />
          </div>
        </>
      ) : (
        <div className="grid place-items-center px-6 py-16 text-center text-sm text-muted">{t("placeholder")}</div>
      )}
    </Card>
  );
}
