import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SafeUser } from "@/lib/auth";

/**
 * Page-level guard for any route that requires a logged-in user with a
 * permanent password set. Redirects rather than throwing, since this runs
 * in server components during render.
 */
export async function requirePageUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.temporaryPasswordRequired) redirect("/account/set-password");
  return user;
}

export async function requirePageAdmin(): Promise<SafeUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
