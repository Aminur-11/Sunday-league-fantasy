import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import AddPlayerForm from "./AddPlayerForm";
import PlayerRow from "./PlayerRow";
import type { Position } from "@/lib/scoring";

export default async function AdminPlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: [{ active: "desc" }, { position: "asc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <AddPlayerForm />
      {players.length === 0 ? (
        <EmptyState title="No players yet" description="Add your first player above." />
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <PlayerRow
              key={p.id}
              player={{
                id: p.id,
                name: p.name,
                position: p.position as Position,
                price: Number(p.price),
                active: p.active,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
