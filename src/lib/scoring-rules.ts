import "server-only";
import { prisma } from "@/lib/prisma";
import type { ScoringRules, Position } from "@/lib/scoring";
import type { Prisma } from "@prisma/client";

type ScoringRuleVersionWithRules = Prisma.ScoringRuleVersionGetPayload<{
  include: { positionRules: true };
}>;

export function toScoringRules(version: ScoringRuleVersionWithRules): ScoringRules {
  const positionRules = {} as ScoringRules["positionRules"];
  for (const rule of version.positionRules) {
    positionRules[rule.position as Position] = {
      position: rule.position as Position,
      appearancePoints: rule.appearancePoints,
      goalPoints: rule.goalPoints,
      assistPoints: rule.assistPoints,
      motmPoints: rule.motmPoints,
      concededPenalty: rule.concededPenalty,
      concededThreshold: rule.concededThreshold,
    };
  }
  return {
    positionRules,
    winPoints: version.winPoints,
    drawPoints: version.drawPoints,
    lossPoints: version.lossPoints,
    captainMultiplier: version.captainMultiplier,
  };
}

/** Returns the currently active scoring rule version, creating a default one if none exists. */
export async function getActiveScoringRuleVersion(): Promise<ScoringRuleVersionWithRules> {
  const active = await prisma.scoringRuleVersion.findFirst({
    where: { isActive: true },
    include: { positionRules: true },
  });
  if (active) return active;

  return prisma.scoringRuleVersion.create({
    data: {
      label: "Initial rules",
      isActive: true,
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      captainMultiplier: 2,
      positionRules: {
        create: (["DEF", "MID", "FWD"] as const).map((position) => ({
          position,
          appearancePoints: 2,
          goalPoints: position === "DEF" ? 5 : 4,
          assistPoints: 3,
          motmPoints: 5,
          concededPenalty: 1,
          concededThreshold: 5,
        })),
      },
    },
    include: { positionRules: true },
  });
}

export interface GameRulesInput {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  captainMultiplier: number;
  positionRules: Record<
    Position,
    {
      appearancePoints: number;
      goalPoints: number;
      assistPoints: number;
      motmPoints: number;
      concededPenalty: number;
      concededThreshold: number;
    }
  >;
}

/**
 * Creates a brand-new immutable scoring rule version and marks it active.
 * Existing gameweeks keep referencing whatever version they were assigned —
 * this NEVER mutates a version already in use, only adds a new one.
 */
export async function createNewScoringRuleVersion(
  input: GameRulesInput,
  label: string,
): Promise<ScoringRuleVersionWithRules> {
  return prisma.$transaction(async (tx) => {
    await tx.scoringRuleVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.scoringRuleVersion.create({
      data: {
        label,
        isActive: true,
        winPoints: input.winPoints,
        drawPoints: input.drawPoints,
        lossPoints: input.lossPoints,
        captainMultiplier: input.captainMultiplier,
        positionRules: {
          create: (Object.keys(input.positionRules) as Position[]).map((position) => ({
            position,
            ...input.positionRules[position],
          })),
        },
      },
      include: { positionRules: true },
    });
  });
}
