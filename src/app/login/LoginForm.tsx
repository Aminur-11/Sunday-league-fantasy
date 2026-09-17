"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionResult } from "@/app/actions/auth";
import { Field, TextInput, PrimaryButton, ErrorText } from "@/components/ui";

const initialState: ActionResult = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Username" htmlFor="username">
        <TextInput
          id="username"
          name="username"
          autoComplete="username"
          required
          autoFocus
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <ErrorText>{state.error}</ErrorText>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </PrimaryButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-pitch-dark underline dark:text-pitch">
          Create an account
        </Link>
      </p>
    </form>
  );
}
