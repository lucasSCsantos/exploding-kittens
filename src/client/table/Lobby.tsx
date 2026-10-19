// Waiting room between joining/creating and the game actually starting (ticket 12): shows the
// room code to share, everyone seated around a virtual table (project description §6), the
// host's rule-variant settings (ticket 14), and — for the host only — the Start button.

import type { LobbyConfig } from "../../engine/setup.js";
import { lobbySeatPositions } from "./layout.js";
import { useGameStore } from "./gameStore.js";

export function Lobby() {
  const code = useGameStore((s) => s.code);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const lobbyPlayers = useGameStore((s) => s.lobbyPlayers);
  const config = useGameStore((s) => s.config);
  const updateConfig = useGameStore((s) => s.updateConfig);
  const startGame = useGameStore((s) => s.startGame);
  const lastError = useGameStore((s) => s.lastError);

  const isHost = playerId !== null && playerId === hostId;
  const seats = lobbySeatPositions(lobbyPlayers.length);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 overflow-y-auto bg-neutral-900 p-4 text-white">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-xl text-neutral-300">Room code</h1>
        <p className="text-5xl font-bold tracking-[0.3em] text-amber-400">{code}</p>
      </div>

      <div className="relative aspect-square w-full max-w-80 rounded-full border-2 border-dashed border-neutral-700">
        {lobbyPlayers.map((p, i) => {
          const pos = seats[i]!;
          return (
            <div
              key={p.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${pos.xPercent}%`, top: `${pos.yPercent}%` }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${p.connected ? "bg-neutral-700" : "bg-neutral-800"}`}
              >
                🙂
              </div>
              <span
                className={`whitespace-nowrap text-xs ${p.connected ? "text-white" : "text-white/40"}`}
              >
                {p.name}
                {p.id === hostId && " 👑"}
              </span>
            </div>
          );
        })}
      </div>

      <RoomSettings config={config} editable={isHost} onChange={updateConfig} />

      {isHost ? (
        <button
          type="button"
          onClick={() => startGame()}
          disabled={lobbyPlayers.length < 2}
          className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900 disabled:opacity-50"
        >
          Start game
        </button>
      ) : (
        <p className="text-sm text-neutral-400">Waiting for the host to start the game…</p>
      )}

      {lastError && <p className="text-sm text-red-400">{lastError}</p>}
    </div>
  );
}

interface RoomSettingsProps {
  config: LobbyConfig;
  editable: boolean;
  onChange: (patch: Partial<LobbyConfig>) => void;
}

/** Host-only controls for the table's rule variants (ticket 14) — read-only for everyone else. */
function RoomSettings({ config, editable, onChange }: RoomSettingsProps) {
  const useDefaultExtraDefuses = config.extraDefuses === "default";

  return (
    <fieldset className="flex w-full max-w-80 flex-col gap-3 rounded-lg bg-neutral-800 p-4 text-sm">
      <legend className="px-1 text-neutral-300">Room settings</legend>

      <label className="flex items-center justify-between gap-2">
        <span>Attack stacking</span>
        <input
          type="checkbox"
          checked={config.attackStacking}
          disabled={!editable}
          onChange={(e) => onChange({ attackStacking: e.target.checked })}
        />
      </label>

      <label className="flex items-center justify-between gap-2">
        <span>Combo scope</span>
        <select
          value={config.comboScope}
          disabled={!editable}
          onChange={(e) =>
            onChange({ comboScope: e.target.value as LobbyConfig["comboScope"] })
          }
          className="rounded bg-neutral-700 px-2 py-1 text-white disabled:opacity-60"
        >
          <option value="cats-only">Cats only</option>
          <option value="any-matching">Any matching card</option>
        </select>
      </label>

      <label className="flex items-center justify-between gap-2">
        <span>Feral pairs</span>
        <select
          value={config.feralPairRule}
          disabled={!editable}
          onChange={(e) =>
            onChange({ feralPairRule: e.target.value as LobbyConfig["feralPairRule"] })
          }
          className="rounded bg-neutral-700 px-2 py-1 text-white disabled:opacity-60"
        >
          <option value="requires-real-cat">Needs a real cat</option>
          <option value="allowed">Two Ferals allowed</option>
        </select>
      </label>

      <label className="flex items-center justify-between gap-2">
        <span>Extra defuses</span>
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useDefaultExtraDefuses}
            disabled={!editable}
            onChange={(e) => onChange({ extraDefuses: e.target.checked ? "default" : 0 })}
          />
          default
          <input
            type="number"
            min={0}
            value={useDefaultExtraDefuses ? "" : config.extraDefuses}
            disabled={!editable || useDefaultExtraDefuses}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isNaN(parsed)) return; // e.g. the field was cleared mid-edit
              onChange({ extraDefuses: Math.max(0, parsed) });
            }}
            className="w-14 rounded bg-neutral-700 px-2 py-1 text-white disabled:opacity-60"
          />
        </span>
      </label>
    </fieldset>
  );
}
