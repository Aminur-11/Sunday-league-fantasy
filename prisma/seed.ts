import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const SAMPLE_PLAYERS: { name: string; position: "DEF" | "MID" | "FWD"; price: number }[] = [
  { name: "Amin Rahman", position: "MID", price: 8.5 },
  { name: "Jordan Clarke", position: "DEF", price: 6.0 },
  { name: "Sam Osei", position: "DEF", price: 6.5 },
  { name: "Liam Turner", position: "DEF", price: 5.5 },
  { name: "Chris Novak", position: "DEF", price: 5.0 },
  { name: "Dan Whitfield", position: "MID", price: 7.5 },
  { name: "Ben Carter", position: "MID", price: 7.0 },
  { name: "Tom Ellery", position: "MID", price: 6.0 },
  { name: "Marcus Reid", position: "MID", price: 5.5 },
  { name: "Kwame Boateng", position: "FWD", price: 9.0 },
  { name: "Ollie Bright", position: "FWD", price: 8.0 },
  { name: "Josh Meadows", position: "FWD", price: 7.0 },
  { name: "Ravi Patel", position: "FWD", price: 6.5 },
  { name: "Callum Hayes", position: "DEF", price: 5.0 },
  { name: "Nate Ferreira", position: "MID", price: 6.5 },
  { name: "Leo Sinclair", position: "FWD", price: 6.0 },
];

async function main() {
  await prisma.leagueSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", budget: 100 },
  });

  let activeVersion = await prisma.scoringRuleVersion.findFirst({
    where: { isActive: true },
  });

  if (!activeVersion) {
    activeVersion = await prisma.scoringRuleVersion.create({
      data: {
        label: "Initial rules",
        isActive: true,
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        captainMultiplier: 2,
        positionRules: {
          create: [
            {
              position: "DEF",
              appearancePoints: 2,
              goalPoints: 5,
              assistPoints: 3,
              motmPoints: 5,
              concededPenalty: 1,
              concededThreshold: 5,
            },
            {
              position: "MID",
              appearancePoints: 2,
              goalPoints: 4,
              assistPoints: 3,
              motmPoints: 5,
              concededPenalty: 1,
              concededThreshold: 5,
            },
            {
              position: "FWD",
              appearancePoints: 2,
              goalPoints: 4,
              assistPoints: 3,
              motmPoints: 5,
              concededPenalty: 1,
              concededThreshold: 5,
            },
          ],
        },
      },
    });
    console.log(`Created initial scoring rule version: ${activeVersion.id}`);
  }

  const existingPlayers = await prisma.player.count();
  if (existingPlayers === 0) {
    await prisma.player.createMany({
      data: SAMPLE_PLAYERS,
    });
    console.log(`Seeded ${SAMPLE_PLAYERS.length} players.`);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!existingAdmin) {
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: "ADMIN",
        temporaryPasswordRequired: true,
      },
    });
    console.log("=".repeat(60));
    console.log("Created admin account:");
    console.log(`  username: ${admin.username}`);
    console.log(`  temporary password: ${tempPassword}`);
    console.log("  (you will be asked to set a new password on first login)");
    console.log("=".repeat(60));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
