"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/primitives/page";
import { Toolbar } from "@/components/primitives/toolbar";
import { Card, CardHead } from "@/components/primitives/card";
import { Empty } from "@/components/primitives/empty";
import { RevisionQueueTable } from "@/components/revisions/revision-queue-table";
import { ApproveRevisionModal } from "@/components/revisions/approve-revision-modal";
import { RevisionTimeline } from "@/components/panels/revision-timeline";
import { useRevisionQueue, usePanels, usePanelRevisions } from "@/lib/query/hooks";
import type { RevisionRequest } from "@/lib/api/types";

type Filter = "all" | "draft" | "review";

export default function RevisionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [approve, setApprove] = useState<RevisionRequest | null>(null);

  const { data: queue = [], isLoading, isError } = useRevisionQueue("all");
  const { data: panels = [] } = usePanels();

  const filtered = queue.filter((r) => filter === "all" || r.status === filter);

  // Right-hand history panel — show the panel referenced by the first queue item.
  const focusPanel = useMemo(() => {
    const tag = queue[0]?.tag;
    return panels.find((p) => p.tag === tag) ?? panels[0];
  }, [queue, panels]);
  const { data: focusRevs = [] } = usePanelRevisions(focusPanel?.id ?? "");

  return (
    <Page>
      <Toolbar>
        <div className="tabs" style={{ border: "none", gap: 0 }}>
          {(
            [
              ["all", "All"],
              ["draft", "Drafts"],
              ["review", "In review"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={`tab${filter === k ? " active" : ""}`}
              onClick={() => setFilter(k)}
              style={{ background: "transparent", border: "none" }}
            >
              {l}
              <span className="count">
                {k === "all" ? queue.length : queue.filter((r) => r.status === k).length}
              </span>
            </button>
          ))}
        </div>
      </Toolbar>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--gap)" }}>
        <Card style={{ overflow: "hidden" }}>
          <CardHead title="Open revision requests" />
          {isLoading ? (
            <Empty icon="git-branch" title="Loading revisions…" />
          ) : isError ? (
            <Empty icon="alert-triangle" title="Couldn't load the queue" />
          ) : filtered.length === 0 ? (
            <Empty icon="check-circle" title="Queue is clear" sub="No open drafts or reviews." />
          ) : (
            <RevisionQueueTable rows={filtered} onOpen={setApprove} />
          )}
        </Card>

        <Card>
          <CardHead
            title={focusPanel ? `${focusPanel.name} — history` : "History"}
            actions={
              focusPanel && (
                <span className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
                  {focusPanel.tag}
                </span>
              )
            }
          />
          <div style={{ padding: 14, maxHeight: 460, overflow: "auto" }}>
            {focusRevs.length === 0 ? (
              <Empty icon="history" title="No history" />
            ) : (
              <RevisionTimeline revs={focusRevs} />
            )}
          </div>
        </Card>
      </div>

      <ApproveRevisionModal req={approve} onClose={() => setApprove(null)} />
    </Page>
  );
}
