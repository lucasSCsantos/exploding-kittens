// Starts the client-side hot-seat harness with however many names the host types in.

import { useState } from "react";
import { useGameStore } from "./gameStore.js";

export function NewGameForm() {
  const [namesInput, setNamesInput] = useState("Alice, Bob, Charlie");
  const startGame = useGameStore((s) => s.startGame);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const names = namesInput
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length >= 2) {
      startGame(names);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-900 text-white"
    >
      <h1 className="text-2xl font-semibold">Exploding Friends</h1>
      <label className="flex flex-col gap-1 text-sm text-neutral-300">
        Player names (comma-separated, 2-10)
        <input
          value={namesInput}
          onChange={(e) => setNamesInput(e.target.value)}
          className="w-80 rounded border border-neutral-600 bg-neutral-800 px-3 py-2 text-white"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-neutral-900"
      >
        Start hot-seat game
      </button>
    </form>
  );
}
