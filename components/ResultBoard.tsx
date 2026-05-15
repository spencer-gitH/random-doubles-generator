"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Assignment, Player } from "@/lib/types";
import {
  generateAssignments,
  TooFewPlayersError,
  TooManyPlayersError,
} from "@/lib/randomize";

const STORAGE_KEY_PREFIX = "rdg-roster:";

export default function ResultBoard({ slug }: { slug: string }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const roll = useCallback(() => {
    setError(null);
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + slug);
    if (!raw) {
      setError("Roster not found. Go back and reload from the event.");
      return;
    }
    try {
      const players = JSON.parse(raw) as Player[];
      setAssignment(generateAssignments(players));
    } catch (err) {
      if (err instanceof TooFewPlayersError || err instanceof TooManyPlayersError) {
        setError(err.message);
      } else {
        setError(`Failed to randomize: ${(err as Error).message}`);
      }
    }
  }, [slug]);

  useEffect(() => {
    roll();
    setHasLoaded(true);
  }, [roll]);

  if (!hasLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-gray-500">
        Loading...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link href={`/event/${slug}`} className="text-sm underline">
          Back to roster
        </Link>
      </main>
    );
  }

  if (!assignment) return null;

  return (
    <main className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full">
      <div className="sticky top-0 z-10 bg-white -mx-4 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
        <Link href={`/event/${slug}`} className="text-xs text-gray-500 underline">
          ← Roster
        </Link>
        <button
          type="button"
          onClick={roll}
          className="rounded-md bg-black px-3 py-1.5 text-white text-sm font-medium"
        >
          Re-randomize
        </button>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {assignment.cards.map((card, i) => (
          <section
            key={`${card.hole}-${i}`}
            className="rounded-lg border border-gray-200 p-4"
          >
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Hole {card.hole}
              </h2>
              <span className="text-xs text-gray-500">
                {card.size} players
              </span>
            </header>
            <ul className="flex flex-col gap-2">
              {card.teams.map((team, ti) => (
                <li key={team.id}>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Team {String.fromCharCode(65 + ti)}
                  </div>
                  <div className="text-base">
                    {team.players[0].name} <span className="text-gray-400">&</span>{" "}
                    {team.players[1].name}
                  </div>
                </li>
              ))}
              {card.cali && (
                <li>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Cali
                  </div>
                  <div className="text-base">
                    {card.cali.name}{" "}
                    <span className="text-xs text-gray-400">(1 mulligan/hole)</span>
                  </div>
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
