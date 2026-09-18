"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getActiveScoringRuleVersion } from "@/lib/scoring-rules";
import { autoSnapshotMissingSquads } from "@/lib/gameweek-lock";
import { recalculateGameweekTeamPoints } from "@/lib/recalc";
import type { ActionResult } from "@/app/actions/auth";
import type { GameweekStatus } from "@prisma/client";

const createGameweekSchema = z.object({
  number: z.coerce.number().int().positive(),
  startAt: z.string().min(1, "Start date/time is required"),
  deadline: z.string().min(1, "Deadline is required"),
});

export async function createGameweekAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createGameweekSchema.safeParse({
    number: formData.get("number"),
    startAt: formData.get("startAt"),
    deadline: formData.get("deadline"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const startAt = new Date(parsed.data.startAt);
  const deadline = new Date(parsed.data.deadline);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(deadline.getTime())) {
    return { error: "Invalid date/time" };
  }
  if (deadline <= startAt) {
    return { error: "Deadline must be after the start time" };
  }

  const existing = await prisma.gameweek.findUnique({ where: { number: parsed.data.number } });
  if (existing) {
    return { error: `Gameweek ${parsed.data.number} already exists` };
  }

  // Only one gameweek should ever be OPEN at a time — team-saving and
  // transfer logic snapshot into "the" open gameweek, which would be
  // ambiguous if two were open simultaneously.
  const alreadyOpen = await prisma.gameweek.findFirst({ where: { status: "OPEN" } });
  if (alreadyOpen) {
    return {
      error: `Gameweek ${alreadyOpen.number} is still open. Lock it before creating a new gameweek.`,
    };
  }

  const activeVersion = await getActiveScoringRuleVersion();

  await prisma.gameweek.create({
    data: {
      number: parsed.data.number,
      startAt,
      deadline,
      status: "OPEN",
      scoringRuleVersionId: activeVersion.id,
    },
  });

  revalidatePath("/admin/gameweeks");
  revalidatePath("/dashboard");
  return { success: true };
}

const ALLOWED_TRANSITIONS: Record<GameweekStatus, GameweekStatus[]> = {
  OPEN: ["LOCKED"],
  LOCKED: ["OPEN", "COMPLETE"],
  COMPLETE: ["LOCKED"],
};

export async function transitionGameweekAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const gameweekId = String(formData.get("gameweekId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "") as GameweekStatus;

  const gameweek = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
  if (!gameweek) return { error: "Gameweek not found" };

  if (!ALLOWED_TRANSITIONS[gameweek.status]?.includes(targetStatus)) {
    return { error: `Cannot move a ${gameweek.status} gameweek to ${targetStatus}` };
  }

  if (targetStatus === "OPEN") {
    const otherOpen = await prisma.gameweek.findFirst({
      where: { status: "OPEN", id: { not: gameweek.id } },
    });
    if (otherOpen) {
      return {
        error: `Gameweek ${otherOpen.number} is already open. Lock it before reopening this one.`,
      };
    }
  }

  const isLockingFromOpen = targetStatus === "LOCKED" && gameweek.status === "OPEN";

  if (isLockingFromOpen) {
    await autoSnapshotMissingSquads(gameweek.id);
  }

  await prisma.gameweek.update({
    where: { id: gameweek.id },
    data: { status: targetStatus },
  });

  if (targetStatus === "COMPLETE") {
    await recalculateGameweekTeamPoints(gameweek.id);
  }

  // Auto-create next week's gameweek as soon as this one is locked, so
  // managers always have the full week to build their team rather than
  // waiting on the admin to remember to click "Create". Defaults on;
  // the admin can uncheck it at lock time (e.g. a bye week) or simply
  // pre-create the next gameweek manually beforehand — either way this
  // step is skipped rather than overriding what's already there.
  let message: string | undefined;
  if (isLockingFromOpen && formData.get("autoCreateNext") !== "false") {
    const nextNumber = gameweek.number + 1;
    const alreadyExists = await prisma.gameweek.findUnique({ where: { number: nextNumber } });
    if (!alreadyExists) {
      const activeVersion = await getActiveScoringRuleVersion();
      await prisma.gameweek.create({
        data: {
          number: nextNumber,
          startAt: gameweek.deadline,
          deadline: new Date(gameweek.deadline.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: "OPEN",
          scoringRuleVersionId: activeVersion.id,
        },
      });
      message = `Next gameweek (#${nextNumber}) was auto-created — check its dates below.`;
    }
  }

  revalidatePath("/admin/gameweeks");
  revalidatePath("/dashboard");
  revalidatePath("/league");
  revalidatePath("/admin/record-stats");
  return { success: true, message };
}

const updateDatesSchema = z.object({
  gameweekId: z.string().min(1),
  startAt: z.string().min(1),
  deadline: z.string().min(1),
});

export async function updateGameweekDatesAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateDatesSchema.safeParse({
    gameweekId: formData.get("gameweekId"),
    startAt: formData.get("startAt"),
    deadline: formData.get("deadline"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const startAt = new Date(parsed.data.startAt);
  const deadline = new Date(parsed.data.deadline);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(deadline.getTime())) {
    return { error: "Invalid date/time" };
  }
  if (deadline <= startAt) {
    return { error: "Deadline must be after the start time" };
  }

  await prisma.gameweek.update({
    where: { id: parsed.data.gameweekId },
    data: { startAt, deadline },
  });

  revalidatePath("/admin/gameweeks");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteGameweekAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const gameweekId = String(formData.get("gameweekId") ?? "");

  const gameweek = await prisma.gameweek.findUnique({
    where: { id: gameweekId },
    include: { _count: { select: { matches: true } } },
  });
  if (!gameweek) return { error: "Gameweek not found" };

  // Only gameweeks with no recorded matches can be deleted — once a match
  // exists, real scoring history (stats, points, standings) hangs off it,
  // and deleting the gameweek would silently rewrite that history. Delete
  // the match(es) first via Record Stats if this gameweek was a mistake.
  if (gameweek._count.matches > 0) {
    return {
      error:
        "This gameweek has recorded matches and can't be deleted. Remove its match(es) from Record Stats first.",
    };
  }

  await prisma.$transaction([
    // Transfer rows aren't cascade-deleted with their gameweek (unlike
    // squads and team points), so they need clearing explicitly first.
    prisma.transfer.deleteMany({ where: { gameweekId } }),
    prisma.gameweek.delete({ where: { id: gameweekId } }),
  ]);

  revalidatePath("/admin/gameweeks");
  revalidatePath("/dashboard");
  revalidatePath("/league");
  return { success: true };
}
