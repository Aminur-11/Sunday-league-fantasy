import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

export const E2E_ADMIN_USERNAME = "e2e_admin";
export const E2E_ADMIN_PASSWORD = "E2eAdminPass123!";
export const E2E_DEACTIVATED_USERNAME = "e2e_deactivated";
export const E2E_DEACTIVATED_PASSWORD = "E2eDeactivatedPass123!";

/**
 * Ensures deterministic, known-credential fixture accounts exist before the
 * suite runs, independent of whatever random temporary password the app's
 * own seed script generates for its own `admin` account.
 */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const adminHash = await argon2.hash(E2E_ADMIN_PASSWORD, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { username: E2E_ADMIN_USERNAME },
      update: { passwordHash: adminHash, role: "ADMIN", active: true, temporaryPasswordRequired: false },
      create: {
        username: E2E_ADMIN_USERNAME,
        passwordHash: adminHash,
        role: "ADMIN",
        temporaryPasswordRequired: false,
      },
    });

    const deactivatedHash = await argon2.hash(E2E_DEACTIVATED_PASSWORD, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { username: E2E_DEACTIVATED_USERNAME },
      update: { passwordHash: deactivatedHash, active: false, temporaryPasswordRequired: false },
      create: {
        username: E2E_DEACTIVATED_USERNAME,
        passwordHash: deactivatedHash,
        role: "MANAGER",
        active: false,
      },
    });

    const fixturePlayers: { name: string; position: "DEF" | "MID" | "FWD"; price: number }[] = [
      { name: "E2E Def One", position: "DEF", price: 5 },
      { name: "E2E Def Two", position: "DEF", price: 5 },
      { name: "E2E Mid One", position: "MID", price: 5 },
      { name: "E2E Mid Two", position: "MID", price: 5 },
      { name: "E2E Mid Three", position: "MID", price: 5 },
      { name: "E2E Fwd One", position: "FWD", price: 5 },
      { name: "E2E Fwd Two", position: "FWD", price: 5 },
    ];
    for (const fp of fixturePlayers) {
      const existing = await prisma.player.findFirst({ where: { name: fp.name } });
      if (existing) {
        await prisma.player.update({
          where: { id: existing.id },
          data: { position: fp.position, price: fp.price, active: true },
        });
      } else {
        await prisma.player.create({ data: fp });
      }
    }

    // Reset scoring rules to a known baseline before every run. Test 16-17
    // deliberately mutates the active rule version (+10 to FWD goal points)
    // to prove historical gameweeks stay pinned to their original version —
    // without resetting here, repeated suite runs would keep compounding
    // that +10 and every hand-computed point total in the journey spec
    // would drift from run to run.
    await prisma.scoringRuleVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await prisma.scoringRuleVersion.create({
      data: {
        label: "E2E baseline",
        isActive: true,
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        captainMultiplier: 2,
        positionRules: {
          create: [
            { position: "DEF", appearancePoints: 2, goalPoints: 5, assistPoints: 3, motmPoints: 5, concededBonusPoints: 5, concededBonusThreshold: 5 },
            { position: "MID", appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededBonusPoints: 5, concededBonusThreshold: 5 },
            { position: "FWD", appearancePoints: 2, goalPoints: 4, assistPoints: 3, motmPoints: 5, concededBonusPoints: 5, concededBonusThreshold: 5 },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
