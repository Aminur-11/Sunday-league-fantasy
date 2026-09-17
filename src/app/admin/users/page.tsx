import { requirePageAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";

export default async function AdminUsersPage() {
  const me = await requirePageAdmin();
  const users = await prisma.user.findMany({
    include: { fantasyTeam: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => (
        <UserRow
          key={u.id}
          isSelf={u.id === me.id}
          user={{
            id: u.id,
            username: u.username,
            role: u.role,
            active: u.active,
            fantasyTeamId: u.fantasyTeam?.id ?? null,
          }}
        />
      ))}
    </div>
  );
}
