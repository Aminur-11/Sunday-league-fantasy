"use client";

import { useActionState } from "react";
import { updateGameRulesAction } from "@/app/actions/admin-game-rules";
import type { ActionResult } from "@/app/actions/auth";
import { Card, Field, TextInput, PrimaryButton, ErrorText, SuccessText } from "@/components/ui";
import type { Position } from "@/lib/scoring";

export interface PositionRuleValues {
  appearancePoints: number;
  goalPoints: number;
  assistPoints: number;
  motmPoints: number;
  concededPenalty: number;
  concededThreshold: number;
}

const initialState: ActionResult = {};
const POSITIONS: Position[] = ["DEF", "MID", "FWD"];

export default function GameRulesForm({
  winPoints,
  drawPoints,
  lossPoints,
  captainMultiplier,
  positionRules,
}: {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  captainMultiplier: number;
  positionRules: Record<Position, PositionRuleValues>;
}) {
  const [state, formAction, pending] = useActionState(updateGameRulesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Match result points</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Win" htmlFor="winPoints">
            <TextInput id="winPoints" name="winPoints" type="number" defaultValue={winPoints} required />
          </Field>
          <Field label="Draw" htmlFor="drawPoints">
            <TextInput id="drawPoints" name="drawPoints" type="number" defaultValue={drawPoints} required />
          </Field>
          <Field label="Loss" htmlFor="lossPoints">
            <TextInput id="lossPoints" name="lossPoints" type="number" defaultValue={lossPoints} required />
          </Field>
          <Field label="Captain multiplier" htmlFor="captainMultiplier">
            <TextInput
              id="captainMultiplier"
              name="captainMultiplier"
              type="number"
              min={1}
              defaultValue={captainMultiplier}
              required
            />
          </Field>
        </div>
      </Card>

      {POSITIONS.map((position) => (
        <Card key={position}>
          <h2 className="mb-3 text-lg font-semibold">{position} scoring</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Appearance" htmlFor={`${position}_appearancePoints`}>
              <TextInput
                id={`${position}_appearancePoints`}
                name={`${position}_appearancePoints`}
                type="number"
                defaultValue={positionRules[position].appearancePoints}
                required
              />
            </Field>
            <Field label="Goal" htmlFor={`${position}_goalPoints`}>
              <TextInput
                id={`${position}_goalPoints`}
                name={`${position}_goalPoints`}
                type="number"
                defaultValue={positionRules[position].goalPoints}
                required
              />
            </Field>
            <Field label="Assist" htmlFor={`${position}_assistPoints`}>
              <TextInput
                id={`${position}_assistPoints`}
                name={`${position}_assistPoints`}
                type="number"
                defaultValue={positionRules[position].assistPoints}
                required
              />
            </Field>
            <Field label="MOTM" htmlFor={`${position}_motmPoints`}>
              <TextInput
                id={`${position}_motmPoints`}
                name={`${position}_motmPoints`}
                type="number"
                defaultValue={positionRules[position].motmPoints}
                required
              />
            </Field>
            <Field label="Conceded penalty" htmlFor={`${position}_concededPenalty`}>
              <TextInput
                id={`${position}_concededPenalty`}
                name={`${position}_concededPenalty`}
                type="number"
                defaultValue={positionRules[position].concededPenalty}
                required
              />
            </Field>
            <Field label="Per every N conceded" htmlFor={`${position}_concededThreshold`}>
              <TextInput
                id={`${position}_concededThreshold`}
                name={`${position}_concededThreshold`}
                type="number"
                min={1}
                defaultValue={positionRules[position].concededThreshold}
                required
              />
            </Field>
          </div>
        </Card>
      ))}

      <ErrorText>{state.error}</ErrorText>
      {state.success && (
        <SuccessText>
          Saved. These rules apply to future gameweeks only — completed gameweeks keep the rules
          that applied at the time.
        </SuccessText>
      )}
      <PrimaryButton type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save rules"}
      </PrimaryButton>
    </form>
  );
}
