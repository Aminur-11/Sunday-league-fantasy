import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Safety net run when a gameweek transitions to LOCKED: any fantasy team
 * that never explicitly saved a squad for this gameweek (because the
 * manager made no changes while it was open) gets one snapshotted now from
 * their current persistent roster, so historical scoring always has a
 * squad to work from. Teams with an incomplete roster (fewer than 7
 * players — e.g. a brand new manager) are left without a squad and simply
 * score 0 for this gameweek.
 */
export async function autoSnapshotMissingSquads(gameweekId: string): Promise<void> {
  const [teams, existingSquads] = await Promise.all([
    prisma.fantasyTeam.findMany({
      include: { currentPlayers: { include: { player: true } } },
    }),
    prisma.fantasyGameweekSquad.findMany({
      where: { gameweekId },
      select: { fantasyTeamId: true },
    }),
  ]);

  const alreadySnapshotted = new Set(existingSquads.map((s) => s.fantasyTeamId));

  for (const team of teams) {
    if (alreadySnapshotted.has(team.id)) continue;
    if (team.currentPlayers.length !== 7) continue;

    const squad = await prisma.fantasyGameweekSquad.create({
      data: { fantasyTeamId: team.id, gameweekId },
    });
    await prisma.fantasyGameweekSquadPlayer.createMany({
      data: team.currentPlayers.map((sp) => ({
        squadId: squad.id,
        playerId: sp.playerId,
        isCaptain: sp.isCaptain,
        positionAtTime: sp.player.position,
        priceAtTime: sp.player.price,
      })),
    });
  }
}
