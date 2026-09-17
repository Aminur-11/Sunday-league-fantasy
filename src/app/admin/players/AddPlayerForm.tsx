"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPlayerAction } from "@/app/actions/admin-players";
import type { ActionResult } from "@/app/actions/auth";
import { Card, Field, TextInput, PrimaryButton, ErrorText } from "@/components/ui";

const initialState: ActionResult = {};

export default function AddPlayerForm() {
  const [state, formAction, pending] = useActionState(createPlayerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Add player</h2>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Name" htmlFor="name">
          <TextInput id="name" name="name" required maxLength={60} />
        </Field>
        <Field label="Position" htmlFor="position">
          <select
            id="position"
            name="position"
            required
            className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2.5 text-base outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/30"
          >
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FWD">FWD</option>
          </select>
        </Field>
        <Field label="Price (£m)" htmlFor="price">
          <TextInput id="price" name="price" type="number" step="0.5" min="0" required />
        </Field>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add player"}
        </PrimaryButton>
      </form>
      <div className="mt-3">
        <ErrorText>{state.error}</ErrorText>
      </div>
    </Card>
  );
}
