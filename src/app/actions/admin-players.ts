"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { playerInputSchema } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/auth";

export async function createPlayerAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = playerInputSchema.safeParse({
    name: formData.get("name"),
    position: formData.get("position"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.player.create({
    data: {
      name: parsed.data.name,
      position: parsed.data.position,
      price: parsed.data.price,
    },
  });

  revalidatePath("/admin/players");
  revalidatePath("/team");
  return { success: true };
}

export async function updatePlayerAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = playerInputSchema.safeParse({
    name: formData.get("name"),
    position: formData.get("position"),
    price: formData.get("price"),
  });
  if (!id) return { error: "Missing player id" };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.player.update({
    where: { id },
    data: {
      name: parsed.data.name,
      position: parsed.data.position,
      price: parsed.data.price,
    },
  });

  revalidatePath("/admin/players");
  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/league");
  return { success: true };
}

export async function setPlayerActiveAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { error: "Missing player id" };

  await prisma.player.update({ where: { id }, data: { active } });

  revalidatePath("/admin/players");
  revalidatePath("/team");
  return { success: true };
}
