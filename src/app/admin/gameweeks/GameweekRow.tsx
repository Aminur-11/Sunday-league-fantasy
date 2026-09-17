"use client";

import { useActionState, useState, useTransition } from "react";
import {
  transitionGameweekAction,
  updateGameweekDatesAction,
} from "@/app/actions/admin-gameweeks";
import type { ActionResult } from "@/app/actions/auth";
import {
  Card,
  Badge,
  SecondaryButton,
  PrimaryButton,
  DangerButton,
  ErrorText,
  Field,
  TextInput,
} from "@/components/ui";
import type { GameweekStatus } from "@prisma/client";

const STATUS_TONE: Record<GameweekStatus, "default" | "muted" | "gold"> = {
  OPEN: "default",
  LOCKED: "muted",
  COMPLETE: "gold",
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface GameweekRowData {
  id: string;
  number: number;
  startAt: string;
  deadline: string;
  status: GameweekStatus;
}

const initialState: ActionResult = {};

export default function GameweekRow({ gw }: { gw: GameweekRowData }) {
  const [transitionState, dispatchTransition] = useActionState(
    transitionGameweekAction,
    initialState,
  );
  const [datesState, datesAction, datesPending] = useActionState(
    updateGameweekDatesAction,
    initialState,
  );
  const [editingDates, setEditingDates] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Invoking the action directly (rather than submitting a <form>) avoids a
  // browser quirk: calling form.requestSubmit() from inside that same
  // form's own submit handler is silently blocked as a re-entrant
  // submission, which is what made the confirm()-gated buttons below no-op.
  function fireTransition(targetStatus: GameweekStatus, confirmMessage?: string) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    const formData = new FormData();
    formData.set("gameweekId", gw.id);
    formData.set("targetStatus", targetStatus);
    startTransition(() => {
      dispatchTransition(formData);
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            Gameweek {gw.number} <Badge tone={STATUS_TONE[gw.status]}>{gw.status}</Badge>
          </p>
          <p className="text-sm text-muted">
            {new Date(gw.startAt).toLocaleString()} → deadline {new Date(gw.deadline).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {gw.status === "OPEN" && (
            <SecondaryButton
              type="button"
              disabled={isPending}
              onClick={() => fireTransition("LOCKED")}
            >
              Lock
            </SecondaryButton>
          )}
          {gw.status === "LOCKED" && (
            <>
              <SecondaryButton
                type="button"
                disabled={isPending}
                onClick={() => fireTransition("OPEN")}
              >
                Reopen
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={isPending}
                onClick={() =>
                  fireTransition(
                    "COMPLETE",
                    `Complete Gameweek ${gw.number}? This finalises points and locks manager changes.`,
                  )
                }
              >
                Complete
              </PrimaryButton>
            </>
          )}
          {gw.status === "COMPLETE" && (
            <DangerButton
              type="button"
              disabled={isPending}
              onClick={() =>
                fireTransition(
                  "LOCKED",
                  `Reopen Gameweek ${gw.number} for correction? Remember to Complete it again afterwards.`,
                )
              }
            >
              Reopen for correction
            </DangerButton>
          )}
          <SecondaryButton type="button" onClick={() => setEditingDates((v) => !v)}>
            {editingDates ? "Cancel" : "Edit dates"}
          </SecondaryButton>
        </div>
      </div>

      <ErrorText>{transitionState.error}</ErrorText>

      {editingDates && (
        <form action={datesAction} className="mt-4 grid grid-cols-1 gap-3 border-t border-card-border pt-4 sm:grid-cols-3 sm:items-end">
          <input type="hidden" name="gameweekId" value={gw.id} />
          <Field label="Start" htmlFor={`startAt-${gw.id}`}>
            <TextInput
              id={`startAt-${gw.id}`}
              name="startAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(new Date(gw.startAt))}
              required
            />
          </Field>
          <Field label="Deadline" htmlFor={`deadline-${gw.id}`}>
            <TextInput
              id={`deadline-${gw.id}`}
              name="deadline"
              type="datetime-local"
              defaultValue={toLocalInputValue(new Date(gw.deadline))}
              required
            />
          </Field>
          <PrimaryButton type="submit" disabled={datesPending}>
            {datesPending ? "Saving…" : "Save dates"}
          </PrimaryButton>
          <div className="sm:col-span-3">
            <ErrorText>{datesState.error}</ErrorText>
          </div>
        </form>
      )}
    </Card>
  );
}
