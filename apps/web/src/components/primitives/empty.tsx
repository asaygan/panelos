import { Icon, type IconName } from "@/components/icons/icon";

export interface EmptyProps {
  icon: IconName;
  title: string;
  sub?: string;
}

export function Empty({ icon, title, sub }: EmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        color: "var(--c-ink-3)",
        textAlign: "center",
      }}
    >
      <Icon name={icon} size={26} style={{ color: "var(--c-ink-4)", marginBottom: 10 }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-ink-2)" }}>{title}</div>
      {sub && <div style={{ fontSize: "var(--fz-sm)", marginTop: 3, maxWidth: 280 }}>{sub}</div>}
    </div>
  );
}
