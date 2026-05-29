import type { User } from "@/lib/api/types";

export interface AvatarProps {
  user: Pick<User, "initials" | "color">;
  size?: number;
}

export function Avatar({ user, size = 24 }: AvatarProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "none",
        background: user.color ?? "var(--c-ink-3)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        letterSpacing: ".02em",
      }}
    >
      {user.initials}
    </span>
  );
}
