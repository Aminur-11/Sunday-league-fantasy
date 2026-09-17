import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { recalculateMatch, recalculateGameweekTeamPoints } from "@/lib/recalc";
import { createNewScoringRuleVersion, getActiveScoringRuleVersion } from "@/lib/scoring-rules";

// These tests hit a real Postgres database (fantasy7_test) via the recalc
// engine's actual Prisma calls, verifying the properties unit tests can't:
// idempotent recalculation, scoring-rule version freezing across gameweeks,
// and immunity to later Player position edits. Run with `npm run test:integration`.

const prisma = new PrismaClient();

async function wipeDatabase() {
  await prisma.fantasyPlayerPoints.deleteMany();
  await prisma.fantasyTeamGameweekPoints.deleteMany();
  await prisma.playerMatchStat.deleteMany();
  await prisma.match.deleteMany();
  await prisma.fantasyGameweekSquadPlayer.deleteMany();
  await prisma.fantasyGameweekSquad.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.fantasyTeamPlayer.deleteMany();
  await prisma.fantasyTeam.deleteMany();
  await prisma.gameweek.deleteMany();
  await prisma.positionScoringRule.deleteMany();
  await prisma.scoringRuleVersion.deleteMany();
  await prisma.player.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await wipeDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeGameweek(number: number, versionId: string) {
  const now = new Date();
  return prisma.gameweek.create({
    data: {
      number,
      startAt: new Date(now.getTime() - 3600_000),
      deadline: new Date(now.getTime() - 1800_000),
      status: "LOCKED",
      scoringRuleVersionId: versionId,
    },
  });
}

describe("recalculateMatch — idempotent recalculation", () => {
  it("produces identical stored points no matter how many times it runs", async () => {
    const version = await getActiveScoringRuleVersion();
    const gw = await makeGameweek(101, version.id);

    const player = await prisma.player.create({
      data: { name: "Idempotent MID", position: "MID", price: 5 },
    });

    const user = await prisma.user.create({
      data: { username: "idem_manager", passwordHash: "x", role: "MANAGER" },
    });
    const team = await prisma.fantasyTeam.create({
      data: { managerId: user.id, name: "Idempotent FC" },
    });
    const squad = await prisma.fantasyGameweekSquad.create({
      data: { fantasyTeamId: team.id, gameweekId: gw.id },
    });
    await prisma.fantasyGameweekSquadPlayer.create({
      data: {
        squadId: squad.id,
        playerId: player.id,
        isCaptain: true,
        positionAtTime: "MID",
        priceAtTime: 5,
      },
    });

    const match = await prisma.match.create({
      data: { gameweekId: gw.id, teamAName: "Reds", teamBName: "Blues", scoreA: 3, scoreB: 1 },
    });
    await prisma.playerMatchStat.create({
      data: {
        matchId: match.id,
        playerId: player.id,
        teamSide: "A",
        appearance: true,
        goals: 2,
        assists: 1,
        motm: true,
        positionAtTime: "MID",
      },
    });

    await recalculateMatch(match.id);
    const first = await prisma.fantasyTeamGameweekPoints.findUniqueOrThrow({
      where: { fantasyTeamId_gameweekId: { fantasyTeamId: team.id, gameweekId: gw.id } },
    });
    const firstPlayerPoints = await prisma.fantasyPlayerPoints.findMany({
      where: { gameweekId: gw.id },
    });

    // Run it again (and again) with no source-data changes.
    await recalculateMatch(match.id);
    await recalculateMatch(match.id);
    await recalculateGameweekTeamPoints(gw.id);

    const second = await prisma.fantasyTeamGameweekPoints.findUniqueOrThrow({
      where: { fantasyTeamId_gameweekId: { fantasyTeamId: team.id, gameweekId: gw.id } },
    });
    const secondPlayerPoints = await prisma.fantasyPlayerPoints.findMany({
      where: { gameweekId: gw.id },
    });

    expect(second.points).toBe(first.points);
    expect(secondPlayerPoints).toHaveLength(firstPlayerPoints.length);
    expect(secondPlayerPoints).toHaveLength(1);

    // appearance 2 + goals(2*4=8) + assists 3 + motm 5 + win 3 = 21 base, captain x2 = 42
    expect(first.points).toBe(42);
  });

  it("editing a match (delete + recreate stats) does not duplicate points", async () => {
    const version = await getActiveScoringRuleVersion();
    const gw = await makeGameweek(102, version.id);

    const player = await prisma.player.create({
      data: { name: "Editable FWD", position: "FWD", price: 6 },
    });
    const user = await prisma.user.create({
      data: { username: "edit_manager", passwordHash: "x", role: "MANAGER" },
    });
    const team = await prisma.fantasyTeam.create({
      data: { managerId: user.id, name: "Editable FC" },
    });
    const squad = await prisma.fantasyGameweekSquad.create({
      data: { fantasyTeamId: team.id, gameweekId: gw.id },
    });
    await prisma.fantasyGameweekSquadPlayer.create({
      data: {
        squadId: squad.id,
        playerId: player.id,
        isCaptain: false,
        positionAtTime: "FWD",
        priceAtTime: 6,
      },
    });

    const match = await prisma.match.create({
      data: { gameweekId: gw.id, teamAName: "Reds", teamBName: "Blues", scoreA: 1, scoreB: 1 },
    });
    const stat = await prisma.playerMatchStat.create({
      data: {
        matchId: match.id,
        playerId: player.id,
        teamSide: "A",
        appearance: true,
        goals: 1,
        assists: 0,
        motm: false,
        positionAtTime: "FWD",
      },
    });
    await recalculateMatch(match.id);

    // Admin corrects the goal count from 1 to 2, the way saveMatchStatsAction
    // does it: delete the old stat rows, insert fresh ones, recalculate.
    await prisma.playerMatchStat.delete({ where: { id: stat.id } });
    await prisma.playerMatchStat.create({
      data: {
        matchId: match.id,
        playerId: player.id,
        teamSide: "A",
        appearance: true,
        goals: 2,
        assists: 0,
        motm: false,
        positionAtTime: "FWD",
      },
    });
    await recalculateMatch(match.id);

    const points = await prisma.fantasyPlayerPoints.findMany({ where: { gameweekId: gw.id } });
    expect(points).toHaveLength(1); // old row was cascaded away with the deleted stat, not left stale
    // appearance 2 + goals(2*4=8) + draw 1 = 11
    expect(points[0].basePoints).toBe(11);

    const teamPoints = await prisma.fantasyTeamGameweekPoints.findUniqueOrThrow({
      where: { fantasyTeamId_gameweekId: { fantasyTeamId: team.id, gameweekId: gw.id } },
    });
    expect(teamPoints.points).toBe(11);
  });
});

describe("scoring-rule versioning — historical stability", () => {
  it("a completed gameweek keeps its original rules after the active version changes", async () => {
    const versionA = await createNewScoringRuleVersion(
      {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        captainMultiplier: 2,
        positionRules: {
          DEF: { appearancePoints: 2, goalPoints: 5, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
          MID: { appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
          FWD: { appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
        },
      },
      "Version A — DEF goal = 5",
    );

    const gw1 = await makeGameweek(201, versionA.id);
    const defender = await prisma.player.create({
      data: { name: "Versioned DEF", position: "DEF", price: 5 },
    });
    const match1 = await prisma.match.create({
      data: { gameweekId: gw1.id, teamAName: "Reds", teamBName: "Blues", scoreA: 2, scoreB: 0 },
    });
    await prisma.playerMatchStat.create({
      data: {
        matchId: match1.id,
        playerId: defender.id,
        teamSide: "A",
        appearance: true,
        goals: 1,
        assists: 0,
        motm: false,
        positionAtTime: "DEF",
      },
    });
    await recalculateMatch(match1.id);
    await prisma.gameweek.update({ where: { id: gw1.id }, data: { status: "COMPLETE" } });

    const gw1PointsBefore = await prisma.fantasyPlayerPoints.findFirst({
      where: { gameweekId: gw1.id, playerId: defender.id },
    });
    // appearance 2 + goal(1*5=5) + win 3 = 10 under version A
    expect(gw1PointsBefore?.basePoints).toBe(10);

    // Admin changes the rules: DEF goal now worth 6.
    const versionB = await createNewScoringRuleVersion(
      {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        captainMultiplier: 2,
        positionRules: {
          DEF: { appearancePoints: 2, goalPoints: 6, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
          MID: { appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
          FWD: { appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededPenalty: 1, concededThreshold: 5 },
        },
      },
      "Version B — DEF goal = 6",
    );
    expect(versionB.id).not.toBe(versionA.id);

    const gw2 = await makeGameweek(202, versionB.id);
    const match2 = await prisma.match.create({
      data: { gameweekId: gw2.id, teamAName: "Reds", teamBName: "Blues", scoreA: 2, scoreB: 0 },
    });
    await prisma.playerMatchStat.create({
      data: {
        matchId: match2.id,
        playerId: defender.id,
        teamSide: "A",
        appearance: true,
        goals: 1,
        assists: 0,
        motm: false,
        positionAtTime: "DEF",
      },
    });
    await recalculateMatch(match2.id);

    const gw2Points = await prisma.fantasyPlayerPoints.findFirst({
      where: { gameweekId: gw2.id, playerId: defender.id },
    });
    // appearance 2 + goal(1*6=6) + win 3 = 11 under version B
    expect(gw2Points?.basePoints).toBe(11);

    // Recalculating GW1 again (e.g. as part of a batch job) must NOT pick up
    // version B's rules — it stays pinned to version A forever.
    await recalculateMatch(match1.id);
    const gw1PointsAfter = await prisma.fantasyPlayerPoints.findFirst({
      where: { gameweekId: gw1.id, playerId: defender.id },
    });
    expect(gw1PointsAfter?.basePoints).toBe(10);
  });
});

describe("player position changes — historical immunity", () => {
  it("a completed match keeps scoring by the position frozen at entry time, even after the player's position changes", async () => {
    const version = await getActiveScoringRuleVersion();
    const gw = await makeGameweek(301, version.id);

    const player = await prisma.player.create({
      data: { name: "Repositioned Player", position: "MID", price: 7 },
    });
    const match = await prisma.match.create({
      data: { gameweekId: gw.id, teamAName: "Reds", teamBName: "Blues", scoreA: 1, scoreB: 0 },
    });
    await prisma.playerMatchStat.create({
      data: {
        matchId: match.id,
        playerId: player.id,
        teamSide: "A",
        appearance: true,
        goals: 1,
        assists: 0,
        motm: false,
        positionAtTime: "MID", // frozen at the moment stats were recorded
      },
    });
    await recalculateMatch(match.id);

    const beforeChange = await prisma.fantasyPlayerPoints.findFirst({
      where: { gameweekId: gw.id, playerId: player.id },
    });
    // MID goal = 4: appearance 2 + goal 4 + win 3 = 9
    expect(beforeChange?.basePoints).toBe(9);

    // Player is later reclassified as a forward.
    await prisma.player.update({ where: { id: player.id }, data: { position: "FWD" } });

    // Recalculating the same historical match must still use MID rules,
    // because positionAtTime on the stat row is untouched by the Player edit.
    await recalculateMatch(match.id);
    const afterChange = await prisma.fantasyPlayerPoints.findFirst({
      where: { gameweekId: gw.id, playerId: player.id },
    });
    expect(afterChange?.basePoints).toBe(9);
  });
});
