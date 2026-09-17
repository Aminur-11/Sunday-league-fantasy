"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNewScoringRuleVersion } from "@/lib/scoring-rules";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/app/actions/auth";
import type { Position } from "@/lib/scoring";

const positionFields = z.object({
  appearancePoints: z.coerce.number().int(),
  goalPoints: z.coerce.number().int(),
  assistPoints: z.coerce.number().int(),
  motmPoints: z.coerce.number().int(),
  concededPenalty: z.coerce.number().int(),
  concededThreshold: z.coerce.number().int().min(1, "Threshold must be at least 1"),
});

const schema = z.object({
  winPoints: z.coerce.number().int(),
  drawPoints: z.coerce.number().int(),
  lossPoints: z.coerce.number().int(),
  captainMultiplier: z.coerce.number().int().min(1),
  DEF: positionFields,
  MID: positionFields,
  FWD: positionFields,
});

export async function updateGameRulesAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw: Record<string, unknown> = {
    winPoints: formData.get("winPoints"),
    drawPoints: formData.get("drawPoints"),
    lossPoints: formData.get("lossPoints"),
    captainMultiplier: formData.get("captainMultiplier"),
  };
  for (const position of ["DEF", "MID", "FWD"] as Position[]) {
    raw[position] = {
      appearancePoints: formData.get(`${position}_appearancePoints`),
      goalPoints: formData.get(`${position}_goalPoints`),
      assistPoints: formData.get(`${position}_assistPoints`),
      motmPoints: formData.get(`${position}_motmPoints`),
      concededPenalty: formData.get(`${position}_concededPenalty`),
      concededThreshold: formData.get(`${position}_concededThreshold`),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await createNewScoringRuleVersion(
    {
      winPoints: parsed.data.winPoints,
      drawPoints: parsed.data.drawPoints,
      lossPoints: parsed.data.lossPoints,
      captainMultiplier: parsed.data.captainMultiplier,
      positionRules: {
        DEF: parsed.data.DEF,
        MID: parsed.data.MID,
        FWD: parsed.data.FWD,
      },
    },
    `Rules updated ${new Date().toISOString()}`,
  );

  revalidatePath("/admin/game-rules");
  return { success: true };
}
