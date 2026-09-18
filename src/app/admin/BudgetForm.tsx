"use client";

import { useActionState } from "react";
import { updateBudgetAction } from "@/app/actions/admin-settings";
import type { ActionResult } from "@/app/actions/auth";
import { Field, TextInput, PrimaryButton, ErrorText, SuccessText } from "@/components/ui";

const initialState: ActionResult = {};

export default function BudgetForm({ currentBudget }: { currentBudget: number }) {
  const [state, formAction, pending] = useActionState(updateBudgetAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <Field label="Team budget (£m)" htmlFor="budget" hint="Applies to team building going forward.">
        <TextInput
          id="budget"
          name="budget"
          type="number"
          step="0.5"
          min="0"
          defaultValue={currentBudget}
          required
        />
      </Field>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save budget"}
      </PrimaryButton>
      <div className="sm:ml-2">
        <ErrorText>{state.error}</ErrorText>
        {state.success && <SuccessText>Saved.</SuccessText>}
      </div>
    </form>
  );
}
