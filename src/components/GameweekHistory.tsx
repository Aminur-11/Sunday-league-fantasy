import { Badge } from "@/components/ui";

const STATUS_TONE = {
  OPEN: "default",
  LOCKED: "muted",
  COMPLETE: "gold",
} as const;

export interface GameweekHistoryEntry {
  gameweekId: string;
  number: number;
  status: "OPEN" | "LOCKED" | "COMPLETE";
  points: number;
}

export default function GameweekHistory({ entries }: { entries: GameweekHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No gameweeks scored yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((e) => (
        <div
          key={e.gameweekId}
          className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Gameweek {e.number}</span>
            <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
          </div>
          <span className="font-bold">{e.points} pts</span>
        </div>
      ))}
    </div>
  );
}
