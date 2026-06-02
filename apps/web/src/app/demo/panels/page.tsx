"use client";

import { Fragment, useMemo, useState } from "react";
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
import { useToast } from "@/components/primitives/toast";
import { Icon } from "@/components/icons/icon";
import { PanelTreeEditor } from "@/components/panels/tree/panel-tree-editor";
import { NodeDetailPanel } from "@/components/panels/tree/node-detail-panel";
import { useSelection } from "@/components/panels/tree/selection";
import { STATUS_META, type PanelStatus } from "@/lib/utils/status";
import { demoLocations, demoPanels, demoTree } from "@/lib/demo/data";
import type { Panel } from "@/lib/api/types";

type ViewMode = "tree" | "table";

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

export default function DemoPanelsPage() {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [sel, setSel] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<ViewMode>("tree");

  const allPanels = demoPanels;
  const locationList = demoLocations;

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
          <Icon name="chevron-down" size={11} style={{ transform: sort.dir === "asc" ? "rotate(180deg)" : "none" }} />
        )}
      </span>
    </th>
  );

  const allSel = sel.length === rows.length && rows.length > 0;

  const renderRow = (p: Panel) => (
    <tr
      key={p.id}
      className={sel.includes(p.id) ? "sel" : undefined}
      style={{ cursor: "pointer" }}
      onClick={() => router.push(`/demo/panels/${p.id}`)}
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
      <td className="mono strong">{p.rev}</td>
      <td>
        <StatusBadge status={p.status} />
      </td>
      <td className="num">{p.comps}</td>
      <td style={{ color: "var(--c-ink-3)", fontSize: 11 }}>{p.updated.split(" ")[0]}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <Menu
          align="end"
          trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
          items={[
            { label: "Open detail", icon: "external-link", onClick: () => router.push(`/demo/panels/${p.id}`) },
            { label: "View schematics", icon: "file-text", onClick: () => router.push("/demo/schematics") },
            { label: "Generate label", icon: "qr-code", onClick: () => router.push("/demo/labels") },
            { sep: true },
            { label: "Archive", icon: "box", danger: true, onClick: () => toast.success("Demo mode — changes aren't saved.") },
          ]}
        />
      </td>
    </tr>
  );

  return (
    <Page>
      <Toolbar>
        <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--c-surface-3)", borderRadius: "var(--r-sm)" }}>
          <Btn size="sm" icon="git-branch" variant={view === "tree" ? "default" : "ghost"} onClick={() => setView("tree")}>
            Tree
          </Btn>
          <Btn size="sm" icon="list" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>
            Table
          </Btn>
        </div>
        {view === "table" && (
        <>
        <div style={{ position: "relative", width: 240 }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 9, top: 8, color: "var(--c-ink-4)" }} />
          <Input
            style={{ paddingLeft: 28 }}
            placeholder="Filter by name, serial, tag, OEM…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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
          {(["draft", "engineering", "released", "installed", "commissioned", "in_service", "archived"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 6, borderLeft: "1px solid var(--c-line)" }}>
          <Icon name="list" size={14} style={{ color: "var(--c-ink-3)" }} />
          <Select style={{ width: "auto" }} value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} title="Group by">
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
            <Btn size="sm" icon="qr-code" onClick={() => router.push("/demo/labels")}>
              Label {sel.length}
            </Btn>
          )}
          <Btn size="sm" icon="download" onClick={() => toast.success("Demo mode — export disabled.")}>
            Export
          </Btn>
          <Btn size="sm" variant="primary" icon="plus" onClick={() => toast.success("Demo mode — changes aren't saved.")}>
            Add panel
          </Btn>
        </div>
      </Toolbar>

      {view === "tree" ? (
        <DemoTreeView toast={toast} />
      ) : (
      <Card style={{ overflow: "hidden" }}>
        <div style={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
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
                    const counts: Record<PanelStatus, number> = {
                      draft: 0,
                      engineering: 0,
                      released: 0,
                      installed: 0,
                      commissioned: 0,
                      in_service: 0,
                      archived: 0,
                    };
                    items.forEach((i) => counts[i.status]++);
                    const label = groupBy === "status" ? (STATUS_META[key as PanelStatus]?.label ?? key) : key;
                    return (
                      <Fragment key={key}>
                        <tr
                          style={{ background: "var(--c-surface-2)", cursor: "pointer" }}
                          onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                        >
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              setSel((s) => (gAllSel ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
                            }}
                          >
                            <input type="checkbox" checked={gAllSel} readOnly />
                          </td>
                          <td colSpan={10} style={{ borderBottom: "1px solid var(--c-line-strong)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <Icon
                                name="chevron-right"
                                size={14}
                                style={{ color: "var(--c-ink-3)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .12s" }}
                              />
                              <span style={{ fontWeight: 660, color: "var(--c-ink)", fontSize: "var(--fz)" }}>{label}</span>
                              <span
                                className="mono"
                                style={{ fontSize: 10, color: "var(--c-ink-3)", background: "var(--c-surface-3)", padding: "1px 6px", borderRadius: 4 }}
                              >
                                {items.length}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: 6 }}>
                                {(["draft", "engineering", "released", "installed", "commissioned", "in_service", "archived"] as const).map((s) =>
                                  counts[s] > 0 ? (
                                    <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "var(--c-ink-3)" }}>
                                      <span className={`dot dot-${s}`} style={{ width: 6, height: 6, borderRadius: "50%" }} />
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
          {rows.length === 0 && <Empty icon="search" title="No panels match" sub="Try clearing filters or widening your search." />}
        </div>
      </Card>
      )}
    </Page>
  );
}

/** Demo split-pane tree editor. Mutations are stubbed (toast + no persistence). */
function DemoTreeView({ toast }: { toast: ReturnType<typeof useToast> }) {
  const selection = useSelection();
  const stub = async () => {
    toast.success("Demo mode — changes aren't saved.");
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 380px)",
        gap: 12,
        height: "calc(100vh - 200px)",
      }}
    >
      <Card style={{ overflow: "hidden" }}>
        <div style={{ height: "100%", overflow: "auto" }}>
          <PanelTreeEditor
            projects={demoTree}
            unassigned={[]}
            selection={selection}
            onCreateGroup={stub}
            onCreatePanel={stub}
            onCreateCabinet={stub}
          />
        </div>
      </Card>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ height: "100%", overflow: "auto" }}>
          <NodeDetailPanel selected={selection.selected} projects={demoTree} unassigned={[]} />
        </div>
      </Card>
    </div>
  );
}
