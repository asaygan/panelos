"use client";

import { Btn } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Empty } from "@/components/primitives/empty";
import type { LabelTemplateDTO } from "@/lib/api/endpoints";

export interface TemplateListProps {
  templates: LabelTemplateDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewBlank: () => void;
  onNewFromDefault: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function TemplateList({
  templates,
  activeId,
  onSelect,
  onNewBlank,
  onNewFromDefault,
  onDuplicate,
  onDelete,
  onSetDefault,
}: TemplateListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 10,
          borderBottom: "1px solid var(--c-line)",
          flexWrap: "wrap",
        }}
      >
        <Btn size="sm" icon="plus" onClick={onNewBlank}>
          Blank
        </Btn>
        <Btn size="sm" icon="copy" onClick={onNewFromDefault}>
          From default
        </Btn>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {templates.length === 0 ? (
          <Empty icon="qr-code" title="No templates" sub="Create your first label template." />
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              style={{
                borderBottom: "1px solid var(--c-line)",
                background: activeId === t.id ? "var(--c-accent-soft)" : "transparent",
              }}
            >
              <button
                onClick={() => onSelect(t.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "var(--fz-sm)" }}>{t.name}</span>
                {t.is_default && <Badge tone="accent">default</Badge>}
                <span
                  className="mono"
                  style={{ marginLeft: "auto", fontSize: 10, color: "var(--c-ink-4)" }}
                >
                  {t.size_mm}
                </span>
              </button>
              {activeId === t.id && (
                <div style={{ display: "flex", gap: 6, padding: "0 12px 9px", flexWrap: "wrap" }}>
                  <Btn size="sm" onClick={() => onDuplicate(t.id)}>
                    Duplicate
                  </Btn>
                  {!t.is_default && (
                    <Btn size="sm" onClick={() => onSetDefault(t.id)}>
                      Set default
                    </Btn>
                  )}
                  <Btn size="sm" variant="danger" onClick={() => onDelete(t.id)}>
                    Delete
                  </Btn>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
