"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  setUserActiveAction,
  renameUserAction,
  resetPasswordAction,
  setUserRoleAction,
  type ResetPasswordResult,
} from "@/app/actions/admin-users";
import type { ActionResult } from "@/app/actions/auth";
import {
  Card,
  Badge,
  TextInput,
  SecondaryButton,
  PrimaryButton,
  DangerButton,
  ErrorText,
} from "@/components/ui";

export interface UserRowData {
  id: string;
  username: string;
  role: "MANAGER" | "ADMIN";
  active: boolean;
  fantasyTeamId: string | null;
}

const initialState: ActionResult = {};
const initialResetState: ResetPasswordResult = {};

export default function UserRow({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const [, activeAction, activePending] = useActionState(setUserActiveAction, initialState);
  const [renameState, renameAction, renamePending] = useActionState(renameUserAction, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetPasswordAction, initialResetState);
  const [, roleAction, rolePending] = useActionState(setUserRoleAction, initialState);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${!user.active ? "text-muted line-through" : ""}`}>
            {user.username}
          </span>
          <Badge tone={user.role === "ADMIN" ? "gold" : "muted"}>{user.role}</Badge>
          {!user.active && <Badge tone="danger">Deactivated</Badge>}
          {user.fantasyTeamId && (
            <Link href={`/league/${user.fantasyTeamId}`} className="text-sm underline">
              View team
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => setRenaming((v) => !v)}>
            Rename
          </SecondaryButton>

          <form action={roleAction}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="role" value={user.role === "ADMIN" ? "MANAGER" : "ADMIN"} />
            <SecondaryButton type="submit" disabled={rolePending || isSelf}>
              Make {user.role === "ADMIN" ? "Manager" : "Admin"}
            </SecondaryButton>
          </form>

          <form action={resetAction}>
            <input type="hidden" name="id" value={user.id} />
            <SecondaryButton type="submit" disabled={resetPending}>
              Reset password
            </SecondaryButton>
          </form>

          <form action={activeAction}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="active" value={(!user.active).toString()} />
            {user.active ? (
              <DangerButton type="submit" disabled={activePending || isSelf}>
                Deactivate
              </DangerButton>
            ) : (
              <PrimaryButton type="submit" disabled={activePending}>
                Activate
              </PrimaryButton>
            )}
          </form>
        </div>
      </div>

      {renaming && (
        <form action={renameAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-card-border pt-3">
          <input type="hidden" name="id" value={user.id} />
          <TextInput name="username" defaultValue={user.username} maxLength={24} required />
          <PrimaryButton type="submit" disabled={renamePending}>
            Save
          </PrimaryButton>
        </form>
      )}
      <ErrorText>{renameState.error}</ErrorText>

      {resetState.temporaryPassword && (
        <div className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3 text-sm">
          <p className="font-semibold">New temporary password for {user.username}:</p>
          <p className="mt-1 select-all font-mono text-lg">{resetState.temporaryPassword}</p>
          <p className="mt-1 text-xs text-muted">
            Share this with them securely. They&apos;ll be asked to set a new password on next login.
          </p>
        </div>
      )}
      {resetState.error && <ErrorText>{resetState.error}</ErrorText>}
    </Card>
  );
}
