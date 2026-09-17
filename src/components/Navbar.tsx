import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavMenu from "@/components/NavMenu";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-pitch-dark text-white">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="text-xl">⚽</span>
          <span className="hidden sm:inline">Sunday League Fantasy</span>
          <span className="sm:hidden">SLF</span>
        </Link>

        <NavMenu user={user ? { username: user.username, role: user.role } : null} />
      </div>
    </header>
  );
}
