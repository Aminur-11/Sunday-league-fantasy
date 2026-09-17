"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionResult } from "@/app/actions/auth";
import { Field, TextInput, PrimaryButton, ErrorText } from "@/components/ui";

const initialState: ActionResult = {};

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Username"
        htmlFor="username"
        hint="3-24 characters: letters, numbers, underscores, hyphens."
      >
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={24}
          autoFocus
        />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <ErrorText>{state.error}</ErrorText>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </PrimaryButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-pitch-dark underline dark:text-pitch">
          Log in
        </Link>
      </p>
    </form>
  );
}
