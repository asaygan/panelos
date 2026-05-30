"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/primitives/page";
import { Toolbar } from "@/components/primitives/toolbar";
import { Card, CardHead } from "@/components/primitives/card";
import { Empty } from "@/components/primitives/empty";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Meta } from "@/components/primitives/meta";
import { Field } from "@/components/primitives/field";
import { useToast } from "@/components/primitives/toast";
import { RevisionQueueTable } from "@/components/revisions/revision-queue-table";
import { RevisionTimeline } from "@/components/panels/revision-timeline";
import { demoPanels, demoRevisions, demoRevQueue } from "@/lib/demo/data";
import type { RevisionRequest } from "@/lib/api/types";

type Filter = "all" | "draft" | "review";

export default function DemoRevisionsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [approve, setApprove] = useState<RevisionRequest | null>(null);
  const [note, setNote] = useState("");

  const queue = demoRevQueue;
  const panels = demoPanels;
  const filtered = queue.filter((r) => filter === "all" || r.status === filter);

  const focusPanel = useMemo(() => {
    const tag = queue[0]?.tag;
    return panels.find((p) => p.tag === tag) ?? panels[0];
  }, [queue, panels]);

  const close = () => {
    setApprove(null);
    setNote("");
  };

  const run = (action: "approve" | "reject") => {
    toast.success(action === "approve" ? "Demo: revision approved." : "Demo: revision rejected.");
    close();
  };

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
          {filtered.length === 0 ? (
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
            {demoRevisions.length === 0 ? (
              <Empty icon="history" title="No history" />
            ) : (
              <RevisionTimeline revs={demoRevisions} />
            )}
          </div>
        </Card>
      </div>

      {approve && (
        <Modal
          open
          onOpenChange={(o) => !o && close()}
          title={`Review revision ${approve.from}→${approve.rev}`}
          sub={`${approve.panel} · ${approve.tag}`}
          width={540}
          footer={
            <>
              <Btn variant="danger" onClick={() => run("reject")}>
                {approve.status === "draft" ? "Reject" : "Request changes"}
              </Btn>
              <Btn variant="primary" icon="check" onClick={() => run("approve")}>
                Approve &amp; publish
              </Btn>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Meta label="Submitted by" value={approve.by} />
              <Meta label="Date" value={approve.date} mono />
              <Meta label="Status" value={approve.status} />
              <Meta label="New revision" value={approve.rev} mono />
            </div>
            <div>
              <div className="label-cap" style={{ marginBottom: 5 }}>
                Change summary
              </div>
              <div
                style={{
                  fontSize: "var(--fz-sm)",
                  color: "var(--c-ink-2)",
                  lineHeight: 1.55,
                  padding: 11,
                  background: "var(--c-surface-3)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                {approve.note || "—"}
              </div>
            </div>
            <Field label="Approval note (optional)">
              <textarea
                className="input"
                style={{ height: 56, padding: 8, resize: "none" }}
                placeholder="Add a note for the audit trail…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}
