import Link from "next/link";

export const metadata = { title: "QR code not recognized · PanelOS", robots: { index: false } };

export default function UnknownQrPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--c-canvas)",
        color: "var(--c-ink)",
      }}
    >
      <div style={{ maxWidth: 360, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>QR code not recognized</h1>
        <p style={{ fontSize: 14, color: "var(--c-ink-3)", marginBottom: 20 }}>
          This code is not linked to a panel, or the panel was removed. Check the label and scan
          again.
        </p>
        <Link href="/login" style={{ color: "var(--c-accent)", fontWeight: 600 }}>
          Sign in to PanelOS
        </Link>
      </div>
    </main>
  );
}
