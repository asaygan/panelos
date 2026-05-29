export interface LogoProps {
  size?: number;
  withWord?: boolean;
  mono?: boolean;
}

export function Logo({ size = 26, withWord = true, mono = false }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          flex: "none",
          position: "relative",
          background: mono ? "var(--c-ink)" : "linear-gradient(155deg, #4b8cff, #2563eb)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(20,23,26,.2)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg
          width={size * 0.62}
          height={size * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" opacity=".85" />
          <path d="M13 3 9 12h4l-2 9" />
        </svg>
      </div>
      {withWord && (
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 760,
              letterSpacing: "-.02em",
              color: "var(--c-ink)",
            }}
          >
            Panel<span style={{ color: "var(--c-accent)" }}>OS</span>
          </div>
        </div>
      )}
    </div>
  );
}
