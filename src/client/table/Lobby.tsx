// Waiting room between joining/creating and the game actually starting (ticket 12): shows the
// room code to share, who's joined so far, and — for the host only — the Start button.

import { useGameStore } from "./gameStore.js";

export function Lobby() {
  const code = useGameStore((s) => s.code);
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const lobbyPlayers = useGameStore((s) => s.lobbyPlayers);
  const startGame = useGameStore((s) => s.startGame);
  const lastError = useGameStore((s) => s.lastError);

  const isHost = playerId !== null && playerId === hostId;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-900 text-white">
      <h1 className="text-xl text-neutral-300">Room code</h1>
      <p className="text-5xl font-bold tracking-[0.3em] text-amber-400">{code}</p>

      <ul className="flex min-w-48 flex-col gap-1 text-center">
        {lobbyPlayers.map((p) => (
          <li key={p.id} className={p.connected ? "text-white" : "text-white/40"}>
            {p.name}
            {p.id === hostId && " (host)"}
          </li>
        ))}
      </ul>

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
