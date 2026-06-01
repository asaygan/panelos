"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/primitives/page";
import { Toolbar } from "@/components/primitives/toolbar";
import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { Empty } from "@/components/primitives/empty";
import { Menu } from "@/components/primitives/menu";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Icon } from "@/components/icons/icon";
import { AddPanelModal } from "@/components/panels/add-panel-modal";
import { AddPanelSetModal } from "@/components/panels/add-panel-set-modal";
import { PanelTree } from "@/components/panels/panel-tree";
import { usePanels, useLocations, useArchivePanel, useTree } from "@/lib/query/hooks";
import { STATUS_META, type PanelStatus } from "@/lib/utils/status";
import type { Panel } from "@/lib/api/types";

type ViewMode = "tree" | "table";
const VIEW_KEY = "panelos.panels.view";

/** Serialize panel rows to a CSV string (RFC-4180 quoting). */
function panelsToCsv(rows: Panel[]): string {
  const cols: { header: string; get: (p: Panel) => string }[] = [
    { header: "Tag", get: (p) => p.tag },
    { header: "Name", get: (p) => p.name },
    { header: "Serial", get: (p) => p.serial },
    { header: "Customer", get: (p) => String(p.customer ?? "") },
    { header: "Location", get: (p) => p.loc },
    { header: "Area", get: (p) => p.area },
    { header: "Status", get: (p) => STATUS_META[p.status]?.label ?? p.status },
    { header: "Voltage", get: (p) => String(p.volt ?? "") },
    { header: "Current", get: (p) => String(p.amp ?? "") },
    { header: "Updated", get: (p) => p.updated },
  ];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [cols.map((c) => c.header).join(",")];
  for (const p of rows) lines.push(cols.map((c) => esc(c.get(p))).join(","));
  return lines.join("\r\n");
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = "tag" | "serial" | "loc" | "volt" | "mfr" | "rev" | "comps" | "updated";
type GroupKey = "none" | "loc" | "area" | "mfr" | "status" | "volt";

const GROUP_LABEL: Record<GroupKey, string> = {
  none: "No grouping",
  loc: "Location",
  area: "Line / Area",
  mfr: "OEM",
  status: "Status",
  volt: "Voltage class",
};

export default function PanelsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [sel, setSel] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addSetOpen, setAddSetOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("tree");

  // Persist the tree/table preference per user (default tree).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_KEY) : null;
    if (saved === "tree" || saved === "table") setView(saved);
  }, []);
  const setViewPersist = (v: ViewMode) => {
    setView(v);
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, v);
  };

  const { data: allPanels = [], isLoading, isError } = usePanels();
  const { data: locationList = [] } = useLocations();
  const { data: tree, isLoading: treeLoading, isError: treeError } = useTree();
  const archivePanel = useArchivePanel();

  const rows = useMemo(() => {
    let r = allPanels.filter(
      (p) =>
        (loc === "all" || p.loc === loc) &&
        (status === "all" || p.status === status) &&
        (q === "" || (p.name + p.serial + p.tag + p.mfr).toLowerCase().includes(q.toLowerCase())),
    );
    r = [...r].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [allPanels, q, loc, status, sort]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, Panel[]>();
    rows.forEach((p) => {
      const k = String((p as unknown as Record<string, string>)[groupBy] ?? "—");
      const arr = map.get(k);
      if (arr) arr.push(p);
      else map.set(k, [p]);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [rows, groupBy]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const Th = ({ k, children, num }: { k: SortKey; children: React.ReactNode; num?: boolean }) => (
    <th className="sortable" style={{ textAlign: num ? "right" : "left" }} onClick={() => toggleSort(k)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {children}
        {sort.key === k && (
          <Icon
            name="chevron-down"
            size={11}
            style={{ transform: sort.dir === "asc" ? "rotate(180deg)" : "none" }}
          />
        )}
      </span>
    </th>
  );

  const allSel = sel.length === rows.length && rows.length > 0;

  const handleArchive = (p: Panel) => {
    if (!window.confirm(`Archive panel ${p.tag}? It will be hidden from the active fleet.`)) return;
    archivePanel.mutate(p.id, {
      onError: () => window.alert("Could not archive the panel. Please try again."),
    });
  };

  const handleExport = () => {
    // Export the current selection if any rows are checked, else the filtered view.
    const selected = sel.length > 0 ? rows.filter((r) => sel.includes(r.id)) : rows;
    if (selected.length === 0) return;
    downloadCsv(`panels-${selected.length}.csv`, panelsToCsv(selected));
  };

  const renderRow = (p: Panel) => (
    <tr
      key={p.id}
      className={sel.includes(p.id) ? "sel" : undefined}
      style={{ cursor: "pointer" }}
      onClick={() => router.push(`/panels/${p.id}`)}
    >
      <td
        onClick={(e) => {
          e.stopPropagation();
          setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]));
        }}
      >
        <input type="checkbox" checked={sel.includes(p.id)} readOnly />
      </td>
      <td>
        <div className="strong">{p.tag}</div>
        <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{p.name}</div>
      </td>
      <td className="mono" style={{ color: "var(--c-ink-2)" }}>
        {p.serial}
      </td>
      <td>
        {p.loc}
        <div style={{ fontSize: 10, color: "var(--c-ink-4)" }}>{p.area}</div>
      </td>
      <td className="mono">
        {p.volt} <span style={{ color: "var(--c-ink-4)" }}>{p.amp}</span>
      </td>
      <td>{p.mfr}</td>
      <td className="mono strong">
        {p.rev ?? <span style={{ color: "var(--c-ink-4)" }}>·</span>}
      </td>
      <td>
        <StatusBadge status={p.status} />
      </td>
      <td className="num">
        {p.comps ?? <span style={{ color: "var(--c-ink-4)" }}>·</span>}
      </td>
      <td style={{ color: "var(--c-ink-3)", fontSize: 11 }}>{p.updated.split(" ")[0]}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <Menu
          align="end"
          trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
          items={[
            { label: "Open detail", icon: "external-link", onClick: () => router.push(`/panels/${p.id}`) },
            {
              label: "View schematics",
              icon: "file-text",
              onClick: () => router.push(`/schematics?panel=${p.id}`),
            },
            {
              label: "Generate label",
              icon: "qr-code",
              onClick: () => router.push(`/labels?panel=${p.id}`),
            },
            { sep: true },
            { label: "Archive", icon: "box", danger: true, onClick: () => handleArchive(p) },
          ]}
        />
      </td>
    </tr>
  );

  return (
    <Page>
      <Toolbar>
        <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--c-surface-3)", borderRadius: "var(--r-sm)" }}>
          <Btn
            size="sm"
            icon="git-branch"
            variant={view === "tree" ? "default" : "ghost"}
            onClick={() => setViewPersist("tree")}
            title="Tree view"
          >
            Tree
          </Btn>
          <Btn
            size="sm"
            icon="list"
            variant={view === "table" ? "default" : "ghost"}
            onClick={() => setViewPersist("table")}
            title="Table view"
          >
            Table
          </Btn>
        </div>
        {view === "table" && (
          <div style={{ position: "relative", width: 240 }}>
            <Icon
              name="search"
              size={14}
              style={{ position: "absolute", left: 9, top: 8, color: "var(--c-ink-4)" }}
            />
            <Input
              style={{ paddingLeft: 28 }}
              placeholder="Filter by name, serial, tag, OEM…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        {view === "table" && (
        <>
        <Select style={{ width: "auto" }} value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="all">All locations</option>
          {locationList.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          <option value="ok">Energized</option>
          <option value="warn">Attention</option>
          <option value="fault">Fault</option>
          <option value="idle">Offline</option>
        </Select>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingLeft: 6,
            borderLeft: "1px solid var(--c-line)",
          }}
        >
          <Icon name="list" size={14} style={{ color: "var(--c-ink-3)" }} />
          <Select
            style={{ width: "auto" }}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupKey)}
            title="Group by"
          >
            {(Object.entries(GROUP_LABEL) as [GroupKey, string][]).map(([k, label]) => (
              <option key={k} value={k}>
                {k === "none" ? "Group: none" : `Group: ${label}`}
              </option>
            ))}
          </Select>
        </div>
        <span style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)", marginLeft: 2 }}>
          <span className="mono" style={{ color: "var(--c-ink)", fontWeight: 600 }}>
            {rows.length}
          </span>{" "}
          of {allPanels.length}
        </span>
        </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {sel.length > 0 && (
            <Btn
              size="sm"
              icon="qr-code"
              onClick={() => router.push(`/labels?panels=${sel.join(",")}`)}
            >
              Label {sel.length}
            </Btn>
          )}
          {view === "table" && (
            <Btn size="sm" icon="download" onClick={handleExport} disabled={rows.length === 0}>
              Export{sel.length > 0 ? ` (${sel.length})` : ""}
            </Btn>
          )}
          <Btn size="sm" icon="layout-grid" onClick={() => setAddSetOpen(true)}>
            Add set
          </Btn>
          <Btn size="sm" variant="primary" icon="plus" onClick={() => setAddOpen(true)}>
            Add panel
          </Btn>
        </div>
      </Toolbar>

      {view === "tree" ? (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ maxHeight: "calc(100vh - 170px)", overflow: "auto" }}>
            {treeLoading && (
              <Empty icon="server" title="Loading asset tree…" sub="Fetching your facilities." />
            )}
            {treeError && !treeLoading && (
              <Empty icon="alert-triangle" title="Couldn't load the tree" sub="Check your connection and retry." />
            )}
            {!treeLoading && !treeError && tree && (
              <PanelTree sets={tree.sets} unassigned={tree.unassigned} />
            )}
          </div>
        </Card>
      ) : (
      <Card style={{ overflow: "hidden" }}>
        <div style={{ maxHeight: "calc(100vh - 170px)", overflow: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    checked={allSel}
                    onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])}
                  />
                </th>
                <Th k="tag">Tag / Name</Th>
                <Th k="serial">Serial</Th>
                <Th k="loc">Location</Th>
                <Th k="volt">Voltage</Th>
                <Th k="mfr">OEM</Th>
                <Th k="rev">Rev</Th>
                <th>Status</th>
                <Th k="comps" num>
                  Comps
                </Th>
                <Th k="updated">Updated</Th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {grouped == null
                ? rows.map(renderRow)
                : grouped.map(([key, items]) => {
                    const isOpen = !collapsed[key];
                    const ids = items.map((i) => i.id);
                    const gAllSel = ids.every((id) => sel.includes(id));
                    const counts: Record<PanelStatus, number> = { ok: 0, warn: 0, fault: 0, idle: 0 };
                    items.forEach((i) => counts[i.status]++);
                    const label =
                      groupBy === "status"
                        ? (STATUS_META[key as PanelStatus]?.label ?? key)
                        : key;
                    return (
                      <Fragment key={key}>
                        <tr
                          style={{ background: "var(--c-surface-2)", cursor: "pointer" }}
                          onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                        >
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setSel((s) =>
                                gAllSel
                                  ? s.filter((x) => !ids.includes(x))
                                  : [...new Set([...s, ...ids])],
                              );
                            }}
                          >
                            <input type="checkbox" checked={gAllSel} readOnly />
                          </td>
                          <td colSpan={10} style={{ borderBottom: "1px solid var(--c-line-strong)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <Icon
                                name="chevron-right"
                                size={14}
                                style={{
                                  color: "var(--c-ink-3)",
                                  transform: isOpen ? "rotate(90deg)" : "none",
                                  transition: "transform .12s",
                                }}
                              />
                              {groupBy === "loc" && (
                                <Icon name="map-pin" size={13} style={{ color: "var(--c-ink-3)" }} />
                              )}
                              {groupBy === "area" && (
                                <Icon name="cpu" size={13} style={{ color: "var(--c-ink-3)" }} />
                              )}
                              {groupBy === "mfr" && (
                                <Icon name="box" size={13} style={{ color: "var(--c-ink-3)" }} />
                              )}
                              <span
                                style={{ fontWeight: 660, color: "var(--c-ink)", fontSize: "var(--fz)" }}
                              >
                                {label}
                              </span>
                              <span
                                className="mono"
                                style={{
                                  fontSize: 10,
                                  color: "var(--c-ink-3)",
                                  background: "var(--c-surface-3)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                }}
                              >
                                {items.length}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  marginLeft: 6,
                                }}
                              >
                                {(["fault", "warn", "ok", "idle"] as const).map((s) =>
                                  counts[s] > 0 ? (
                                    <span
                                      key={s}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        fontSize: 10.5,
                                        color: "var(--c-ink-3)",
                                      }}
                                    >
                                      <span
                                        className={`dot dot-${s}`}
                                        style={{ width: 6, height: 6, borderRadius: "50%" }}
                                      />
                                      {counts[s]}
                                    </span>
                                  ) : null,
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isOpen && items.map(renderRow)}
                      </Fragment>
                    );
                  })}
            </tbody>
          </table>
          {isLoading && (
            <Empty icon="server" title="Loading panels…" sub="Fetching your fleet from the server." />
          )}
          {isError && !isLoading && (
            <Empty icon="alert-triangle" title="Couldn't load panels" sub="Check your connection and retry." />
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <Empty icon="search" title="No panels match" sub="Try clearing filters or widening your search." />
          )}
        </div>
      </Card>
      )}

      <AddPanelModal
        open={addOpen}
        onOpenChange={setAddOpen}
        locations={locationList}
        onCreated={(id) => router.push(`/panels/${id}`)}
      />
      <AddPanelSetModal open={addSetOpen} onOpenChange={setAddSetOpen} locations={locationList} />
    </Page>
  );
}
