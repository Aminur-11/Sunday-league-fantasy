import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import CreateGameweekForm from "./CreateGameweekForm";
import GameweekRow from "./GameweekRow";

export default async function AdminGameweeksPage() {
  const gameweeks = await prisma.gameweek.findMany({ orderBy: { number: "desc" } });
  const nextNumber = (gameweeks[0]?.number ?? 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      <CreateGameweekForm nextNumber={nextNumber} />

      {gameweeks.length === 0 ? (
        <EmptyState title="No gameweeks yet" description="Create the first gameweek above." />
      ) : (
        <div className="flex flex-col gap-3">
          {gameweeks.map((gw) => (
            <GameweekRow
              key={gw.id}
              gw={{
                id: gw.id,
                number: gw.number,
                startAt: gw.startAt.toISOString(),
                deadline: gw.deadline.toISOString(),
                status: gw.status,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
