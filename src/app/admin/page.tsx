import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export default async function AdminDashboardPage() {
  const [playerCount, userCount, gameweekCount, currentGameweek] = await Promise.all([
    prisma.player.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.gameweek.count(),
    prisma.gameweek.findFirst({ where: { status: "OPEN" }, orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Active players</p>
        <p className="text-3xl font-bold">{playerCount}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Registered users</p>
        <p className="text-3xl font-bold">{userCount}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wide text-muted">Gameweeks created</p>
        <p className="text-3xl font-bold">{gameweekCount}</p>
      </Card>

      <Card className="sm:col-span-3">
        <h2 className="mb-2 text-lg font-semibold">This week</h2>
        {currentGameweek ? (
          <p>
            Gameweek {currentGameweek.number} is <strong>OPEN</strong> until{" "}
            {currentGameweek.deadline.toLocaleString()}.{" "}
            <Link href="/admin/gameweeks" className="underline">
              Manage gameweeks →
            </Link>
          </p>
        ) : (
          <p>
            No gameweek is currently open.{" "}
            <Link href="/admin/gameweeks" className="underline">
              Create one →
            </Link>
          </p>
        )}
        <p className="mt-2">
          <Link href="/admin/record-stats" className="underline">
            Record match stats →
          </Link>
        </p>
      </Card>
    </div>
  );
}
