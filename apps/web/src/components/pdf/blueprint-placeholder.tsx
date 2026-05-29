export interface BlueprintPlaceholderProps {
  sheetNumber: string;
  title: string;
  rev?: string;
  panelName?: string;
  totalSheets?: number;
  width?: number;
}

export function BlueprintPlaceholder({
  sheetNumber,
  title,
  rev,
  panelName,
  totalSheets,
  width = 520,
}: BlueprintPlaceholderProps) {
  return (
    <div
      className="blueprint"
      style={{
        width,
        flex: "none",
        aspectRatio: "1.414",
        borderRadius: 4,
        boxShadow: "var(--shadow-md)",
        position: "relative",
        color: "#cfe0ff",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "46%",
          borderTop: "1px solid rgba(150,190,255,.4)",
          borderLeft: "1px solid rgba(150,190,255,.4)",
          fontSize: 8,
        }}
      >
        <div style={{ display: "flex", borderBottom: "1px solid rgba(150,190,255,.3)" }}>
          <div style={{ flex: 1, padding: "4px 6px" }}>
            <div style={{ opacity: 0.6, fontSize: 7 }}>PROJECT</div>
            {panelName ?? "MCC Line 3"}
          </div>
          <div
            style={{
              width: 60,
              padding: "4px 6px",
              borderLeft: "1px solid rgba(150,190,255,.3)",
            }}
          >
            <div style={{ opacity: 0.6, fontSize: 7 }}>REV</div>
            {rev ?? "E"}
          </div>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1, padding: "4px 6px" }} className="mono">
            <div style={{ opacity: 0.6, fontSize: 7 }}>SHEET</div>
            {sheetNumber} / {totalSheets ?? 10}
          </div>
          <div
            style={{
              width: 60,
              padding: "4px 6px",
              borderLeft: "1px solid rgba(150,190,255,.3)",
            }}
          >
            <div style={{ opacity: 0.6, fontSize: 7 }}>SIZE</div>A3
          </div>
        </div>
      </div>
      <div
        style={{ position: "absolute", top: 12, left: 14, fontSize: 11, fontWeight: 700, color: "#fff" }}
        className="mono"
      >
        {title.toUpperCase()}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color: "#7e96c8",
          fontSize: 11,
        }}
        className="mono"
      >
        [ schematic sheet {sheetNumber} ]
      </div>
    </div>
  );
}
