"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { setBudget } from "@/lib/league-settings";
import type { ActionResult } from "@/app/actions/auth";

const budgetSchema = z.coerce.number().min(0, "Budget must be zero or more").max(9999);

export async function updateBudgetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = budgetSchema.safeParse(formData.get("budget"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid budget" };
  }

  await setBudget(parsed.data);

  revalidatePath("/admin");
  revalidatePath("/team");
  return { success: true };
}
