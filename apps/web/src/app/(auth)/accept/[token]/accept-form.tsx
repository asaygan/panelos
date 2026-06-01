"use client";

import { useActionState } from "react";
import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Field } from "@/components/primitives/field";
import { acceptInviteAction, type AcceptInviteState } from "@/lib/auth/server-actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState | undefined, FormData>(
    acceptInviteAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <Field label="Your name (optional)">
          <Input name="name" type="text" placeholder="Jane Engineer" autoComplete="name" />
        </Field>
        <Field label="Password">
          <Input
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
          />
        </Field>
        <Field label="Confirm password">
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        {state?.error && (
          <div
            style={{
              fontSize: 11,
              color: "var(--c-fault)",
              background: "var(--c-fault-soft)",
              border: "1px solid var(--c-fault-line)",
              borderRadius: "var(--r-sm)",
              padding: "6px 9px",
            }}
          >
            {state.error}
          </div>
        )}
        <Btn
          variant="primary"
          type="submit"
          disabled={pending}
          style={{ height: 34, justifyContent: "center", marginTop: 4 }}
        >
          {pending ? "Activating…" : "Activate account"}
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: "var(--c-ink-4)", marginTop: 22, textAlign: "center" }}>
        By activating, you agree to your organization&apos;s access policy.
      </div>
    </form>
  );
}
