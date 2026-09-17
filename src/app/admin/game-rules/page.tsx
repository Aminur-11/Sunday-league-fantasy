import { getActiveScoringRuleVersion } from "@/lib/scoring-rules";
import GameRulesForm, { type PositionRuleValues } from "./GameRulesForm";
import type { Position } from "@/lib/scoring";

export default async function AdminGameRulesPage() {
  const version = await getActiveScoringRuleVersion();

  const positionRules = {} as Record<Position, PositionRuleValues>;
  for (const r of version.positionRules) {
    positionRules[r.position as Position] = {
      appearancePoints: r.appearancePoints,
      goalPoints: r.goalPoints,
      assistPoints: r.assistPoints,
      motmPoints: r.motmPoints,
      concededPenalty: r.concededPenalty,
      concededThreshold: r.concededThreshold,
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Editing these rules creates a new versioned snapshot for future gameweeks. Gameweeks that
        are already locked or complete keep using the rules that applied when they were created.
      </p>
      <GameRulesForm
        winPoints={version.winPoints}
        drawPoints={version.drawPoints}
        lossPoints={version.lossPoints}
        captainMultiplier={version.captainMultiplier}
        positionRules={positionRules}
      />
    </div>
  );
}
