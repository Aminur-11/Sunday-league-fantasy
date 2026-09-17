"use client";

import { useActionState, useState } from "react";
import { updatePlayerAction, setPlayerActiveAction } from "@/app/actions/admin-players";
import type { ActionResult } from "@/app/actions/auth";
import {
  Card,
  Badge,
  TextInput,
  SecondaryButton,
  PrimaryButton,
  ErrorText,
} from "@/components/ui";
import type { Position } from "@/lib/scoring";

export interface PlayerRowData {
  id: string;
  name: string;
  position: Position;
  price: number;
  active: boolean;
}

const initialState: ActionResult = {};

export default function PlayerRow({ player }: { player: PlayerRowData }) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updatePlayerAction,
    initialState,
  );
  const [, toggleAction, togglePending] = useActionState(setPlayerActiveAction, initialState);

  if (editing) {
    return (
      <Card>
        <form action={updateAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="id" value={player.id} />
          <TextInput name="name" defaultValue={player.name} required maxLength={60} />
          <select
            name="position"
            defaultValue={player.position}
            required
            className="w-full rounded-lg border border-card-border bg-transparent px-3 py-2.5 text-base outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/30"
          >
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FWD">FWD</option>
          </select>
          <TextInput name="price" type="number" step="0.5" min="0" defaultValue={player.price} required />
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={updatePending}>
              Save
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEditing(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
        <ErrorText>{updateState.error}</ErrorText>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${!player.active ? "text-muted line-through" : ""}`}>
            {player.name}
          </span>
          <Badge tone="muted">{player.position}</Badge>
          <span className="text-sm text-muted">£{player.price.toFixed(1)}m</span>
          {!player.active && <Badge tone="danger">Inactive</Badge>}
        </div>
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={() => setEditing(true)}>
            Edit
          </SecondaryButton>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={player.id} />
            <input type="hidden" name="active" value={(!player.active).toString()} />
            <SecondaryButton type="submit" disabled={togglePending}>
              {player.active ? "Deactivate" : "Activate"}
            </SecondaryButton>
          </form>
        </div>
      </div>
    </Card>
  );
}
