import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import SetPasswordForm from "./SetPasswordForm";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-2 text-center text-2xl font-bold">Choose a new password</h1>
      <p className="mb-6 text-center text-sm text-muted">
        You&apos;re using a temporary password. Set a permanent one to continue.
      </p>
      <Card>
        <SetPasswordForm />
      </Card>
    </div>
  );
}
