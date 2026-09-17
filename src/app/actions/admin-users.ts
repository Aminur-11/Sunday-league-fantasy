"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, generateTemporaryPassword, hashPassword } from "@/lib/auth";
import { usernameSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/auth";

export async function setUserActiveAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (id === admin.id && !active) {
    return { error: "You cannot deactivate your own account." };
  }

  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function renameUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid username" };
  }

  try {
    await prisma.user.update({ where: { id }, data: { username: parsed.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That username is already taken." };
    }
    throw e;
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export interface ResetPasswordResult extends ActionResult {
  temporaryPassword?: string;
}

export async function resetPasswordAction(
  _prev: ResetPasswordResult,
  formData: FormData,
): Promise<ResetPasswordResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id },
    data: { passwordHash, temporaryPasswordRequired: true },
  });

  revalidatePath("/admin/users");
  return { success: true, temporaryPassword: tempPassword };
}

export async function setUserRoleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");

  if (role !== "ADMIN" && role !== "MANAGER") {
    return { error: "Invalid role" };
  }
  if (id === admin.id && role !== "ADMIN") {
    return { error: "You cannot remove your own admin access." };
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
  return { success: true };
}
