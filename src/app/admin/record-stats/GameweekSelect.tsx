"use client";

import { useRouter } from "next/navigation";
import type { GameweekStatus } from "@prisma/client";

export default function GameweekSelect({
  gameweeks,
  selectedId,
}: {
  gameweeks: { id: string; number: number; status: GameweekStatus }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/admin/record-stats?gameweek=${e.target.value}`)}
      className="w-full max-w-xs rounded-lg border border-card-border bg-transparent px-3 py-2.5 text-base outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/30"
    >
      {gameweeks.map((g) => (
        <option key={g.id} value={g.id}>
          Gameweek {g.number} ({g.status})
        </option>
      ))}
    </select>
  );
}
