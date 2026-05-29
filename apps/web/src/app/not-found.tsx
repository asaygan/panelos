import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--c-ink-2)",
      }}
    >
      <div className="mono" style={{ fontSize: 48, fontWeight: 700, color: "var(--c-ink)" }}>
        404
      </div>
      <div style={{ fontSize: 14 }}>This page doesn&apos;t exist.</div>
      <Link href="/dashboard" style={{ color: "var(--c-accent)", fontWeight: 540 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
