"use client";

import { useActionState } from "react";
import { createGameweekAction } from "@/app/actions/admin-gameweeks";
import type { ActionResult } from "@/app/actions/auth";
import { Card, Field, TextInput, PrimaryButton, ErrorText, SuccessText } from "@/components/ui";

const initialState: ActionResult = {};

export default function CreateGameweekForm({ nextNumber }: { nextNumber: number }) {
  const [state, formAction, pending] = useActionState(createGameweekAction, initialState);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Create gameweek</h2>
      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Number" htmlFor="number">
          <TextInput id="number" name="number" type="number" defaultValue={nextNumber} required />
        </Field>
        <Field label="Start" htmlFor="startAt">
          <TextInput id="startAt" name="startAt" type="datetime-local" required />
        </Field>
        <Field label="Deadline" htmlFor="deadline">
          <TextInput id="deadline" name="deadline" type="datetime-local" required />
        </Field>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </PrimaryButton>
      </form>
      <div className="mt-3">
        <ErrorText>{state.error}</ErrorText>
        {state.success && <SuccessText>Gameweek created.</SuccessText>}
      </div>
    </Card>
  );
}
