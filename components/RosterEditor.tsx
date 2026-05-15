"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

const STORAGE_KEY_PREFIX = "rdg-roster:";

export default function RosterEditor({
  slug,
  initialPlayers,
}: {
  slug: string;
  initialPlayers: Player[];
}) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function removePlayer(id: string) {
    setPlayers((cur) => cur.filter((p) => p.id !== id));
  }

  function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setPlayers((cur) => [
      ...cur,
      { id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name },
    ]);
    setNewName("");
  }

  function onRandomize() {
    setError(null);
    if (players.length < 3) {
      setError("Need at least 3 players to make cards.");
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        STORAGE_KEY_PREFIX + slug,
        JSON.stringify(players),
      );
    }
    router.push(`/event/${slug}/randomize`);
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
          >
            <span className="text-sm">{p.name}</span>
            <button
              type="button"
              onClick={() => removePlayer(p.id)}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
        {players.length === 0 && (
          <li className="text-sm text-gray-400 italic px-3 py-2">No players yet</li>
        )}
      </ul>

      <form onSubmit={addPlayer} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a walk-in player"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Add
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onRandomize}
        className="rounded-md bg-black px-4 py-3 text-white font-medium"
      >
        Randomize ({players.length})
      </button>
    </div>
  );
}
