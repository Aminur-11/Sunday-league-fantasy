"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  requireUser,
} from "@/lib/auth";
import { signUpSchema, loginSchema, passwordSchema } from "@/lib/validation";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function signUpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "That username is already taken" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash, role: "MANAGER" },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return { error: "Invalid username or password" };
  }

  if (!user.active) {
    return { error: "This account has been deactivated" };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return { error: "Invalid username or password" };
  }

  await createSession(user.id);

  if (user.temporaryPasswordRequired) {
    redirect("/account/set-password");
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function setNewPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }
  const confirm = formData.get("confirmPassword");
  if (parsed.data !== confirm) {
    return { error: "Passwords do not match" };
  }

  const passwordHash = await hashPassword(parsed.data);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, temporaryPasswordRequired: false },
  });

  redirect("/dashboard");
}
