// Entry screen: create a new room (becoming its host) or join one by its 4-letter code
// (ticket 12). Replaces the Phase-2 hot-seat name list.

import { useState } from "react";
import { ErrorToast } from "./ErrorToast.js";
import { useGameStore } from "./gameStore.js";

export function NewGameForm() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (mode === "create") {
      createRoom(trimmedName);
    } else {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;
      joinRoom(trimmedCode, trimmedName);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-900 text-white"
    >
      <h1 className="text-2xl font-semibold">Exploding Friends</h1>

      <div className="flex gap-2 rounded-full bg-neutral-800 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-full px-4 py-1 ${mode === "create" ? "bg-amber-500 text-neutral-900" : "text-white/70"}`}
        >
          Criar sala
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-full px-4 py-1 ${mode === "join" ? "bg-amber-500 text-neutral-900" : "text-white/70"}`}
        >
          Entrar em sala
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Seu nome
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64 rounded border border-neutral-600 bg-neutral-800 px-3 py-2 text-white"
        />
      </label>

      {mode === "join" && (
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Código da sala
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-64 rounded border border-neutral-600 bg-neutral-800 px-3 py-2 text-center text-lg uppercase tracking-widest text-white"
          />
        </label>
      )}

      <button
        type="submit"
        className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900"
      >
        {mode === "create" ? "Criar sala" : "Entrar em sala"}
      </button>

      <ErrorToast />
    </form>
  );
}
