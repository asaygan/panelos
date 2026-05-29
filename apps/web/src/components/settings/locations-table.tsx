"use client";

import { useState } from "react";
import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Menu } from "@/components/primitives/menu";
import {
  useLocations,
  usePanels,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/lib/query/hooks";

export function LocationsTable() {
  const { data: locations = [] } = useLocations();
  const { data: panels = [] } = usePanels();
  const createLoc = useCreateLocation();
  const updateLoc = useUpdateLocation();
  const deleteLoc = useDeleteLocation();

  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [eCode, setECode] = useState("");
  const [eName, setEName] = useState("");
  const [eRegion, setERegion] = useState("");

  const submit = async () => {
    if (!code || !name) return;
    await createLoc.mutateAsync({ code, name, region: region || undefined });
    setCode("");
    setName("");
    setRegion("");
    setAdding(false);
  };

  const startEdit = (l: { id: string; code: string; name: string; sub?: string }) => {
    setEditId(l.id);
    setECode(l.code);
    setEName(l.name);
    setERegion(l.sub ?? "");
  };

  const saveEdit = async () => {
    if (!editId || !eCode || !eName) return;
    await updateLoc.mutateAsync({
      id: editId,
      body: { code: eCode, name: eName, region: eRegion || undefined },
    });
    setEditId(null);
  };

  return (
    <div>
      <div className="card-head">
        <span className="card-title">Plants & locations</span>
        <Btn size="sm" icon="plus" variant="primary" onClick={() => setAdding((v) => !v)}>
          Add location
        </Btn>
      </div>
      {adding && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 10,
            borderBottom: "1px solid var(--c-line)",
            alignItems: "center",
          }}
        >
          <Input style={{ width: 80 }} placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input style={{ flex: 1 }} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input style={{ width: 160 }} placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} />
          <Btn size="sm" variant="primary" disabled={!code || !name || createLoc.isPending} onClick={submit}>
            {createLoc.isPending ? "Saving…" : "Save"}
          </Btn>
          <Btn size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Btn>
        </div>
      )}
      <table className="tbl">
        <thead>
          <tr>
            <th>Code</th>
            <th>Location</th>
            <th>Region</th>
            <th>Panels</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {locations.map((l) =>
            editId === l.id ? (
              <tr key={l.id}>
                <td>
                  <Input style={{ width: 70, height: 26 }} value={eCode} onChange={(e) => setECode(e.target.value)} />
                </td>
                <td>
                  <Input style={{ height: 26 }} value={eName} onChange={(e) => setEName(e.target.value)} />
                </td>
                <td>
                  <Input style={{ height: 26 }} value={eRegion} onChange={(e) => setERegion(e.target.value)} />
                </td>
                <td className="num">{panels.filter((p) => p.loc === l.name).length}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Btn size="sm" variant="primary" disabled={!eCode || !eName || updateLoc.isPending} onClick={saveEdit}>
                      {updateLoc.isPending ? "…" : "Save"}
                    </Btn>
                    <Btn size="sm" onClick={() => setEditId(null)}>
                      Cancel
                    </Btn>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={l.id}>
                <td className="mono strong">{l.code}</td>
                <td className="strong">{l.name}</td>
                <td style={{ color: "var(--c-ink-3)" }}>{l.sub}</td>
                <td className="num">{panels.filter((p) => p.loc === l.name).length}</td>
                <td>
                  <Menu
                    align="end"
                    trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
                    items={[
                      { label: "Edit", icon: "pencil", onClick: () => startEdit(l) },
                      { sep: true },
                      { label: "Remove", icon: "x", danger: true, onClick: () => deleteLoc.mutate(l.id) },
                    ]}
                  />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
