import Link from "next/link";
import { requirePageAdmin } from "@/lib/guards";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/record-stats", label: "Record Stats" },
  { href: "/admin/gameweeks", label: "Gameweeks" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/game-rules", label: "Game Rules" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Admin</h1>
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="whitespace-nowrap rounded-lg border border-card-border px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
