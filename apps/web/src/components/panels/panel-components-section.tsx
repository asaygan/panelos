"use client";

import { useRef, useState } from "react";
import { Card, CardHead } from "@/components/primitives/card";
import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Empty } from "@/components/primitives/empty";
import { PanelComponentsTable } from "./panel-components-table";
import {
  usePanelComponents,
  usePanelRevisions,
  useAddComponent,
  useImportBom,
  useCreateRevision,
} from "@/lib/query/hooks";
import { panels as panelsApi, revisions as revisionsApi } from "@/lib/api/endpoints";

/**
 * Resolves a writable (draft) revision for the panel — uses the latest draft if
 * present, otherwise creates one. Used by add-component / import-BOM flows.
 */
async function ensureDraftRevision(panelId: string): Promise<string> {
  const revs = await panelsApi.revisions(panelId);
  const draft = revs.find((r) => r.status === "draft");
  if (draft) return draft.id;
  const created = await revisionsApi.create(panelId, "Component schedule update");
  return created.id;
}

export function PanelComponentsSection({ panelId }: { panelId: string }) {
  const { data: comps = [], isLoading } = usePanelComponents(panelId);
  usePanelRevisions(panelId); // keep revisions cache warm for the draft lookup
  const addComp = useAddComponent();
  const importBom = useImportBom();
  const createRev = useCreateRevision();
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [slot, setSlot] = useState("");
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [part, setPart] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSlot("");
    setRef("");
    setDesc("");
    setPart("");
  };

  const submitAdd = async () => {
    if (!slot || !ref || !desc) return;
    setBusy(true);
    setError(null);
    try {
      const revisionId = await ensureDraftRevision(panelId);
      await addComp.mutateAsync({
        revisionId,
        body: { slot, ref, description: desc, part_number: part || undefined, status: "ok" },
      });
      resetForm();
      setAdding(false);
    } catch {
      setError("Could not add component — check permissions.");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const revisionId = await ensureDraftRevision(panelId);
      await importBom.mutateAsync({ revisionId, file });
    } catch {
      setError("Import failed — check the CSV format and your permissions.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ overflow: "hidden" }}>
      <CardHead
        title="Component schedule"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              size="sm"
              icon="plus"
              onClick={() => setAdding((v) => !v)}
              disabled={createRev.isPending}
            >
              Add component
            </Btn>
            <Btn size="sm" icon="upload" disabled={busy} onClick={() => fileRef.current?.click()}>
              {importBom.isPending ? "Importing…" : "Import BOM"}
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
          </div>
        }
      />
      {error && (
        <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--c-fault)" }}>{error}</div>
      )}
      {adding && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 10,
            borderBottom: "1px solid var(--c-line)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Input style={{ width: 70 }} placeholder="Slot" value={slot} onChange={(e) => setSlot(e.target.value)} />
          <Input style={{ width: 90 }} placeholder="Ref" value={ref} onChange={(e) => setRef(e.target.value)} />
          <Input style={{ flex: 1, minWidth: 160 }} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input style={{ width: 160 }} placeholder="Part number" value={part} onChange={(e) => setPart(e.target.value)} />
          <Btn size="sm" variant="primary" disabled={!slot || !ref || !desc || busy} onClick={submitAdd}>
            {busy ? "Saving…" : "Save"}
          </Btn>
          <Btn size="sm" onClick={() => { setAdding(false); resetForm(); }}>
            Cancel
          </Btn>
        </div>
      )}
      {isLoading ? (
        <Empty icon="cpu" title="Loading components…" />
      ) : comps.length === 0 ? (
        <Empty icon="cpu" title="No components yet" sub="Add a component or import a BOM CSV." />
      ) : (
        <PanelComponentsTable comps={comps} />
      )}
    </Card>
  );
}
