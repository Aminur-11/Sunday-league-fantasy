import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getBudget(): Promise<Prisma.Decimal> {
  const settings = await prisma.leagueSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", budget: 100 },
  });
  return settings.budget;
}

export async function setBudget(budget: number): Promise<void> {
  await prisma.leagueSettings.upsert({
    where: { id: "singleton" },
    update: { budget },
    create: { id: "singleton", budget },
  });
}
