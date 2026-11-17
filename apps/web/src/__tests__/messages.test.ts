import { describe, expect, it } from "vitest";
import en from "../../messages/en/index";
import tr from "../../messages/tr/index";

type Tree = { [key: string]: string | Tree };

function leaves(node: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

/** ICU argument names used by a message, e.g. "{count, plural, …} {name}" → count,name. */
function args(message: string): string[] {
  const names = new Set<string>();
  let depth = 0;
  let token = "";
  for (const ch of message) {
    if (ch === "{") {
      depth += 1;
      token = "";
    } else if (ch === "}") {
      if (depth === 1 && /^[a-zA-Z_][\w]*$/.test(token.trim())) names.add(token.trim());
      depth = Math.max(0, depth - 1);
      token = "";
    } else if (depth === 1) {
      if (ch === ",") {
        if (/^[a-zA-Z_][\w]*$/.test(token.trim())) names.add(token.trim());
        token = "\u0000"; // rest of this argument is format/options, not a name
      } else if (!token.startsWith("\u0000")) token += ch;
    }
  }
  return [...names].sort();
}

describe("message catalogs", () => {
  const trLeaves = leaves(tr as unknown as Tree);
  const enLeaves = leaves(en as unknown as Tree);

  it("Turkish and English define exactly the same keys", () => {
    const missingInEn = [...trLeaves.keys()].filter((k) => !enLeaves.has(k));
    const missingInTr = [...enLeaves.keys()].filter((k) => !trLeaves.has(k));
    expect({ missingInEn, missingInTr }).toEqual({ missingInEn: [], missingInTr: [] });
  });

  it("no key contains a dot (next-intl would read it as nesting)", () => {
    const check = (node: Tree, path: string[] = []): string[] =>
      Object.entries(node).flatMap(([key, value]) => [
        ...(key.includes(".") ? [[...path, key].join(" / ")] : []),
        ...(typeof value === "string" ? [] : check(value, [...path, key])),
      ]);
    expect(check(tr as unknown as Tree)).toEqual([]);
    expect(check(en as unknown as Tree)).toEqual([]);
  });

  it("both languages use the same placeholders in every message", () => {
    const mismatched = [...trLeaves.keys()].filter((key) => {
      const other = enLeaves.get(key);
      return other !== undefined && args(trLeaves.get(key)!).join() !== args(other).join();
    });
    expect(mismatched).toEqual([]);
  });

  it("no message is left empty by accident", () => {
    // Empty strings are allowed only where the UI treats them as "no hint".
    const allowedEmpty = /\.hint$/;
    const empty = [...trLeaves, ...enLeaves]
      .filter(([key, value]) => value.trim() === "" && !allowedEmpty.test(key))
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
