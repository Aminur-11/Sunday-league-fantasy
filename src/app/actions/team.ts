"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBudget } from "@/lib/league-settings";
import { validateFormation, findDuplicateIds, type Position } from "@/lib/scoring";
import { teamNameSchema } from "@/lib/validation";
import { getCurrentGameweek, isEditable } from "@/lib/gameweek";
import type { ActionResult } from "@/app/actions/auth";

export async function saveTeamAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const playerIds = formData.getAll("playerIds").map(String).filter(Boolean);
  const captainId = String(formData.get("captainId") ?? "");
  const teamNameRaw = formData.get("teamName");

  const duplicates = findDuplicateIds(playerIds);
  if (duplicates.length > 0) {
    return { error: "You can't select the same player twice." };
  }
  if (playerIds.length !== 7) {
    return { error: `You need exactly 7 players (currently ${playerIds.length}).` };
  }
  if (!captainId || !playerIds.includes(captainId)) {
    return { error: "Your captain must be one of your 7 selected players." };
  }

  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  if (players.length !== 7) {
    return { error: "One or more selected players could not be found." };
  }
  const inactive = players.find((p) => !p.active);
  if (inactive) {
    return { error: `${inactive.name} is no longer available for selection.` };
  }

  const formation = validateFormation(players.map((p) => p.position as Position));
  if (!formation.valid) {
    return { error: formation.error };
  }

  const budget = await getBudget();
  const totalCost = players.reduce((sum, p) => sum + Number(p.price), 0);
  if (totalCost > Number(budget)) {
    return {
      error: `You are £${(totalCost - Number(budget)).toFixed(1)}m over budget (budget £${Number(budget).toFixed(1)}m).`,
    };
  }

  let teamName: string | undefined;
  if (typeof teamNameRaw === "string" && teamNameRaw.trim().length > 0) {
    const parsed = teamNameSchema.safeParse(teamNameRaw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid team name" };
    }
    teamName = parsed.data;
  }

  // Block edits while the current/most-relevant gameweek is actively LOCKED
  // (match not yet recorded), or still OPEN but its deadline has already
  // passed (in case an admin forgot to flip its status) — not just when no
  // gameweek is OPEN. Once COMPLETE, managers may prepare for the next cycle.
  const currentGameweek = await getCurrentGameweek();
  if (currentGameweek && !isEditable(currentGameweek)) {
    return { error: "This gameweek is locked — changes will apply from the next open gameweek." };
  }
  const openGameweek = currentGameweek?.status === "OPEN" ? currentGameweek : null;

  try {
    await prisma.$transaction(async (tx) => {
      let fantasyTeam = await tx.fantasyTeam.findUnique({
        where: { managerId: user.id },
      });

      if (!fantasyTeam) {
        fantasyTeam = await tx.fantasyTeam.create({
          data: {
            managerId: user.id,
            name: teamName ?? `${user.username}'s Team`,
          },
        });
      } else if (teamName && teamName !== fantasyTeam.name) {
        fantasyTeam = await tx.fantasyTeam.update({
          where: { id: fantasyTeam.id },
          data: { name: teamName },
        });
      }

      await tx.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: fantasyTeam.id } });
      await tx.fantasyTeamPlayer.createMany({
        data: players.map((p) => ({
          fantasyTeamId: fantasyTeam!.id,
          playerId: p.id,
          isCaptain: p.id === captainId,
        })),
      });

      if (openGameweek) {
        const prevSquad = await tx.fantasyGameweekSquad.findUnique({
          where: {
            fantasyTeamId_gameweekId: {
              fantasyTeamId: fantasyTeam.id,
              gameweekId: openGameweek.id,
            },
          },
          include: { players: true },
        });
        const prevIds = new Set(prevSquad?.players.map((p) => p.playerId) ?? []);
        const newIds = new Set(playerIds);
        const outIds = [...prevIds].filter((id) => !newIds.has(id));
        const inIds = [...newIds].filter((id) => !prevIds.has(id));

        const squad = await tx.fantasyGameweekSquad.upsert({
          where: {
            fantasyTeamId_gameweekId: {
              fantasyTeamId: fantasyTeam.id,
              gameweekId: openGameweek.id,
            },
          },
          create: { fantasyTeamId: fantasyTeam.id, gameweekId: openGameweek.id },
          update: {},
        });

        await tx.fantasyGameweekSquadPlayer.deleteMany({ where: { squadId: squad.id } });
        await tx.fantasyGameweekSquadPlayer.createMany({
          data: players.map((p) => ({
            squadId: squad.id,
            playerId: p.id,
            isCaptain: p.id === captainId,
            positionAtTime: p.position,
            priceAtTime: p.price,
          })),
        });

        const pairCount = Math.min(outIds.length, inIds.length);
        for (let i = 0; i < pairCount; i++) {
          await tx.transfer.create({
            data: {
              fantasyTeamId: fantasyTeam.id,
              gameweekId: openGameweek.id,
              playerOutId: outIds[i],
              playerInId: inIds[i],
            },
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That team name is already taken." };
    }
    throw e;
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/league");
  return { success: true };
}
