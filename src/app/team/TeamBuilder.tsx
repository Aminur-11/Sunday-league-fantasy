"use client";

import { useActionState, useMemo, useState } from "react";
import { saveTeamAction } from "@/app/actions/team";
import type { ActionResult } from "@/app/actions/auth";
import { validateFormation, type Position } from "@/lib/scoring";
import {
  Card,
  Field,
  TextInput,
  PrimaryButton,
  ErrorText,
  SuccessText,
  Badge,
} from "@/components/ui";
import PlayerShirt from "@/components/PlayerShirt";

export interface BuilderPlayer {
  id: string;
  name: string;
  position: Position;
  price: number;
}

const POSITIONS: Position[] = ["DEF", "MID", "FWD"];
const POSITION_LABEL: Record<Position, string> = {
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

const initialState: ActionResult = {};

export default function TeamBuilder({
  players,
  initialSelectedIds,
  initialCaptainId,
  initialTeamName,
  budget,
  editable,
  deadlineMessage,
}: {
  players: BuilderPlayer[];
  initialSelectedIds: string[];
  initialCaptainId: string | null;
  initialTeamName: string;
  budget: number;
  editable: boolean;
  deadlineMessage: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveTeamAction, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));
  const [captainId, setCaptainId] = useState<string>(initialCaptainId ?? "");
  const [teamName, setTeamName] = useState(initialTeamName);
  const [filter, setFilter] = useState<Position | "ALL">("ALL");

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const selectedPlayers = useMemo(
    () => [...selected].map((id) => playersById.get(id)).filter((p): p is BuilderPlayer => !!p),
    [selected, playersById],
  );

  const totalCost = selectedPlayers.reduce((sum, p) => sum + p.price, 0);
  const remaining = budget - totalCost;
  const formation = validateFormation(selectedPlayers.map((p) => p.position));

  function toggle(id: string) {
    if (!editable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (captainId === id) setCaptainId("");
      } else {
        if (next.size >= 7) return prev;
        next.add(id);
      }
      return next;
    });
  }

  const visiblePlayers = players.filter((p) => filter === "ALL" || p.position === filter);
  const canSave = editable && selected.size === 7 && formation.valid && remaining >= 0 && !!captainId;

  return (
    <div className="flex flex-col gap-4 pb-28">
      {!editable && deadlineMessage && (
        <div className="rounded-lg bg-black/5 px-4 py-3 text-sm dark:bg-white/10">
          🔒 {deadlineMessage}
        </div>
      )}

      <PitchPreview selectedPlayers={selectedPlayers} captainId={captainId} />

      <Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Players" value={`${selected.size} / 7`} />
          <Stat
            label="Formation"
            value={
              formation.valid
                ? `${formation.counts.DEF}-${formation.counts.MID}-${formation.counts.FWD}`
                : "Invalid"
            }
          />
          <Stat label="Spent" value={`£${totalCost.toFixed(1)}m`} />
          <Stat
            label="Remaining"
            value={`£${remaining.toFixed(1)}m`}
            tone={remaining < 0 ? "danger" : "default"}
          />
        </div>
      </Card>

      <form action={formAction} className="flex flex-col gap-4">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="playerIds" value={id} />
        ))}
        <input type="hidden" name="captainId" value={captainId} />

        <Card>
          <Field label="Team name" htmlFor="teamName">
            <TextInput
              id="teamName"
              name="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={40}
              disabled={!editable}
              placeholder="e.g. Thursday Titans"
            />
          </Field>
        </Card>

        {selected.size === 7 && (
          <Card>
            <p className="mb-3 text-sm font-medium">Captain (2x points)</p>
            <div className="flex flex-col gap-2">
              {selectedPlayers.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-card-border px-3 py-2 has-[:checked]:border-gold has-[:checked]:bg-gold/10"
                >
                  <input
                    type="radio"
                    name="captainRadio"
                    checked={captainId === p.id}
                    onChange={() => editable && setCaptainId(p.id)}
                    disabled={!editable}
                  />
                  <span className="flex-1">{p.name}</span>
                  <Badge tone="muted">{p.position}</Badge>
                </label>
              ))}
            </div>
          </Card>
        )}

        {!formation.valid && selected.size > 0 && (
          <ErrorText>{formation.error}</ErrorText>
        )}
        <ErrorText>{state.error}</ErrorText>
        {state.success && <SuccessText>Team saved!</SuccessText>}

        <div className="flex gap-2 rounded-lg border border-card-border p-1">
          {(["ALL", ...POSITIONS] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-2 py-2 text-sm font-medium ${
                filter === f ? "bg-pitch text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {f === "ALL" ? "All" : f}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {POSITIONS.filter((pos) => filter === "ALL" || filter === pos).map((pos) => (
            <div key={pos}>
              {filter === "ALL" && (
                <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {POSITION_LABEL[pos]}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {visiblePlayers
                  .filter((p) => p.position === pos)
                  .map((p) => {
                    const isSelected = selected.has(p.id);
                    const disabled = !editable || (!isSelected && selected.size >= 7);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                          isSelected
                            ? "border-pitch bg-pitch/10"
                            : "border-card-border"
                        } ${disabled && !isSelected ? "opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(p.id)}
                          disabled={disabled}
                          className="h-5 w-5 accent-[var(--pitch)]"
                        />
                        <span className="flex-1">{p.name}</span>
                        <span className="text-sm text-muted">£{p.price.toFixed(1)}m</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-card-border bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-5xl px-1">
            <PrimaryButton type="submit" className="w-full" disabled={!canSave || pending}>
              {pending ? "Saving…" : "Save team"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-lg font-bold ${tone === "danger" ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

function PitchPreview({
  selectedPlayers,
  captainId,
}: {
  selectedPlayers: BuilderPlayer[];
  captainId: string;
}) {
  const rows: Position[] = ["FWD", "MID", "DEF"];

  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 sm:p-4"
      style={{
        background:
          "repeating-linear-gradient(to bottom, #1e7d3c 0, #1e7d3c 12.5%, #24903f 12.5%, #24903f 25%)",
      }}
    >
      {/* Pitch markings */}
      <div className="pointer-events-none absolute inset-3 sm:inset-4" aria-hidden="true">
        <div className="absolute inset-0 rounded-sm border-2 border-white/40" />
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/40" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 sm:h-20 sm:w-20" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
        <div className="absolute left-1/2 top-0 h-[16%] w-[46%] -translate-x-1/2 border-x-2 border-b-2 border-white/40" />
        <div className="absolute bottom-0 left-1/2 h-[16%] w-[46%] -translate-x-1/2 border-x-2 border-t-2 border-white/40" />
      </div>

      {/* Players */}
      <div className="relative flex flex-col justify-between gap-3 py-2 sm:py-3">
        {rows.map((pos) => (
          <div key={pos} className="flex flex-wrap justify-center gap-3 sm:gap-5">
            {selectedPlayers
              .filter((p) => p.position === pos)
              .map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <PlayerShirt isCaptain={captainId === p.id} />
                  <span className="max-w-[72px] truncate rounded bg-pitch-dark/80 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white sm:max-w-[88px] sm:text-xs">
                    {p.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
              ))}
            {selectedPlayers.filter((p) => p.position === pos).length === 0 && (
              <div className="text-xs text-white/50">—</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
