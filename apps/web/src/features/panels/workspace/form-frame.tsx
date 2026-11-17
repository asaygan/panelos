"use client";

import * as React from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** <form> with an explicit Save / Discard footer that appears once the form is dirty. */
export function FormFrame<T extends FieldValues>({
  form,
  onSubmit,
  onDirtyChange,
  saving,
  children,
}: {
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  onDirtyChange: (dirty: boolean) => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  const tc = useTranslations("common.actions");
  const { isDirty } = form.formState;

  React.useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {children}
      {isDirty && (
        <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-border bg-surface px-5 py-3">
          <Button variant="secondary" disabled={saving} onClick={() => form.reset()}>
            {tc("discard")}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {tc("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
