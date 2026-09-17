"use client";

import { useActionState } from "react";
import { setNewPasswordAction, type ActionResult } from "@/app/actions/auth";
import { Field, TextInput, PrimaryButton, ErrorText } from "@/components/ui";

const initialState: ActionResult = {};

export default function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setNewPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <ErrorText>{state.error}</ErrorText>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </PrimaryButton>
    </form>
  );
}
