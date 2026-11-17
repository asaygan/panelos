"use client";

/**
 * Last-resort boundary for failures in the root layout itself. It replaces the
 * whole document, so it cannot rely on providers, fonts or translations.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#101318",
          color: "#e5e7eb",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Bir şeyler ters gitti</h1>
          <p style={{ margin: "0 0 20px", color: "#949ba7" }}>Something went wrong.</p>
          <button
            onClick={reset}
            style={{
              background: "#c2410c",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tekrar dene · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
