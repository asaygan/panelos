import { describe, expect, it } from "vitest";
import { jwtExp, safeNextPath } from "@/lib/auth/cookies";

function token(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.sig`;
}

describe("jwtExp", () => {
  it("reads exp from a JWT without verifying it", () => {
    expect(jwtExp(token({ exp: 1_800_000_000 }))).toBe(1_800_000_000);
  });
  it("returns null for anything malformed", () => {
    expect(jwtExp("nope")).toBeNull();
    expect(jwtExp("a.%%%.c")).toBeNull();
    expect(jwtExp(token({ sub: "x" }))).toBeNull();
  });
});

describe("safeNextPath (post-login redirect target)", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/panels/123?tab=issues")).toBe("/panels/123?tab=issues");
  });
  it("rejects open redirects and loops", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/login",
      "/login?next=/x",
      "/api/v1/auth/logout",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});
