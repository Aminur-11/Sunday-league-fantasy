import { PrismaClient } from "@prisma/client";

export function randomUsername(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
}

export function fmtDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Finds the next free gameweek number so parallel/repeat test runs never collide. */
export async function nextGameweekNumber(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const highest = await prisma.gameweek.findFirst({ orderBy: { number: "desc" } });
    return (highest?.number ?? 0) + 1;
  } finally {
    await prisma.$disconnect();
  }
}

/** Locks any gameweek left OPEN by a previous run, since only one may be open at a time. */
export async function ensureNoOpenGameweek(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.gameweek.updateMany({ where: { status: "OPEN" }, data: { status: "LOCKED" } });
  } finally {
    await prisma.$disconnect();
  }
}
