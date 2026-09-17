import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getCurrentGameweek } from "@/lib/gameweek";
import { Card, Badge } from "@/components/ui";

interface PlayerBreakdownEntry {
  playerId: string;
  isCaptain: boolean;
  basePoints: number;
  multiplier: number;
  finalPoints: number;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  await requirePageUser();
  const { teamId } = await params;

  const team = await prisma.fantasyTeam.findUnique({
    where: { id: teamId },
    include: {
      manager: { select: { username: true } },
      currentPlayers: { include: { player: true } },
      gameweekPoints: true,
    },
  });
  if (!team) notFound();

  const currentGameweek = await getCurrentGameweek();
  const squad = currentGameweek
    ? await prisma.fantasyGameweekSquad.findUnique({
        where: { fantasyTeamId_gameweekId: { fantasyTeamId: team.id, gameweekId: currentGameweek.id } },
        include: { players: { include: { player: true } } },
      })
    : null;

  const gwPointsRow = currentGameweek
    ? team.gameweekPoints.find((gp) => gp.gameweekId === currentGameweek.id)
    : undefined;
  const breakdown = (gwPointsRow?.breakdown as unknown as PlayerBreakdownEntry[]) ?? [];
  const breakdownByPlayer = new Map(breakdown.map((b) => [b.playerId, b]));

  const totalPoints = team.gameweekPoints.reduce((sum, gp) => sum + gp.points, 0);

  const displayPlayers = squad
    ? squad.players.map((sp) => ({
        id: sp.playerId,
        name: sp.player.name,
        position: sp.positionAtTime,
        isCaptain: sp.isCaptain,
      }))
    : team.currentPlayers.map((sp) => ({
        id: sp.playerId,
        name: sp.player.name,
        position: sp.player.position,
        isCaptain: sp.isCaptain,
      }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/league" className="text-sm underline">
          ← Back to league
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{team.name}</h1>
        <p className="text-sm text-muted">Managed by {team.manager.username}</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Overall points</span>
          <span className="text-2xl font-bold">{totalPoints}</span>
        </div>
        {currentGameweek && gwPointsRow && (
          <div className="mt-2 flex items-center justify-between border-t border-card-border pt-2">
            <span className="text-sm text-muted">
              Gameweek {currentGameweek.number}{" "}
              {currentGameweek.status !== "COMPLETE" && "(provisional)"}
            </span>
            <span className="text-xl font-bold">{gwPointsRow.points}</span>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Squad</h2>
        {displayPlayers.length === 0 ? (
          <p className="text-sm text-muted">This team hasn&apos;t been built yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {displayPlayers.map((p) => {
              const pb = breakdownByPlayer.get(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm"
                >
                  <span>
                    {p.name}
                    {p.isCaptain && <span className="ml-1 text-gold">(C)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">{p.position}</Badge>
                    {pb && (
                      <span className="text-xs text-muted">
                        {pb.basePoints}
                        {pb.multiplier > 1 ? ` × ${pb.multiplier}` : ""} = {pb.finalPoints}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
