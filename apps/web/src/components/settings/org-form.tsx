"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useCompany, useUpdateCompany, usePresignUpload } from "@/lib/query/hooks";
import { files as filesApi } from "@/lib/api/endpoints";

/** Force the PUT through the same-origin Next proxy to dodge cross-origin/CORS. */
function toSameOrigin(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function OrgForm() {
  const { data: company } = useCompany();
  const update = useUpdateCompany();
  const presign = usePresignUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [standards, setStandards] = useState("IEC 61439");
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setShortName(company.short_name ?? "");
      setStandards(company.standards_profile || "IEC 61439");
    }
  }, [company]);

  const logoKey =
    company && "logo_key" in company ? (company as { logo_key?: string | null }).logo_key : null;
  const logoUrl = logoKey ? filesApi.serveUrl(logoKey) : null;

  const onLogo = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoErr("Logo must be a PNG, SVG or JPG image.");
      return;
    }
    setLogoBusy(true);
    setLogoErr(null);
    try {
      const ct = file.type || "image/png";
      const pre = await presign.mutateAsync({ filename: file.name, contentType: ct });
      const put = await fetch(toSameOrigin(pre.url), {
        method: pre.method ?? "PUT",
        headers: pre.headers ?? { "Content-Type": ct },
        body: file,
      });
      if (!put.ok) throw new Error("upload failed");
      await update.mutateAsync({ logo_key: pre.key });
    } catch {
      setLogoErr("Logo upload failed. Try again.");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setSaved(false);
    await update.mutateAsync({ name, short_name: shortName, standards_profile: standards });
    setSaved(true);
  };

  const initials = (shortName || name || "NF").slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="card-head">
        <span className="card-title">Organization profile</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              background: logoUrl ? "var(--c-surface-3)" : "var(--c-ink)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
              fontWeight: 800,
              overflow: "hidden",
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
            />
            <Btn size="sm" icon="upload" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
              {logoBusy ? "Uploading…" : "Replace logo"}
            </Btn>
            <div style={{ fontSize: 11, color: logoErr ? "var(--c-fault)" : "var(--c-ink-4)", marginTop: 5 }}>
              {logoErr ?? "PNG, SVG or JPG · used on labels & exports"}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Legal name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Short name (labels)">
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} />
          </Field>
          <Field label="Standards profile">
            <Select value={standards} onChange={(e) => setStandards(e.target.value)}>
              <option value="IEC 61439">IEC 61439</option>
              <option value="UL 508A">UL 508A</option>
            </Select>
          </Field>
          <Field label="Default voltage class">
            <Select defaultValue="lv">
              <option value="lv">Low voltage (≤1kV)</option>
              <option value="mv">Medium voltage</option>
            </Select>
          </Field>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          padding: 14,
          borderTop: "1px solid var(--c-line)",
        }}
      >
        {saved && <span style={{ fontSize: 12, color: "var(--c-ok)", marginRight: "auto" }}>Saved</span>}
        <Btn>Cancel</Btn>
        <Btn variant="primary" disabled={update.isPending} onClick={save}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Btn>
      </div>
    </div>
  );
}
