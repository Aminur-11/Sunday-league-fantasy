"use client";

import { useRouter } from "next/navigation";

export interface MatchSummary {
  id: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
}

export default function MatchList({
  gameweekId,
  matches,
  selectedMatchId,
  disabled,
}: {
  gameweekId: string;
  matches: MatchSummary[];
  selectedMatchId: string | null;
  disabled: boolean;
}) {
  const router = useRouter();

  function go(matchId: string) {
    router.push(`/admin/record-stats?gameweek=${gameweekId}&match=${matchId}`);
  }

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
      {matches.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => go(m.id)}
          className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${
            selectedMatchId === m.id
              ? "border-pitch bg-pitch/10"
              : "border-card-border hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {m.teamAName} {m.scoreA}-{m.scoreB} {m.teamBName}
        </button>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => go("new")}
          className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium ${
            selectedMatchId === "new"
              ? "border-pitch bg-pitch/10"
              : "border-dashed border-card-border hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          + New match
        </button>
      )}
    </div>
  );
}
