"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { isPossibleNicknameOf, nameKey } from "@/lib/nameKey";

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
  const [notice, setNotice] = useState<string | null>(null);

  function removePlayer(id: string) {
    setNotice(null);
    setPlayers((cur) => cur.filter((p) => p.id !== id));
  }

  function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return;

    // Block exact duplicates regardless of case / spacing / punctuation, so a
    // walk-in can't double up a player already pulled from UDisc.
    const key = nameKey(name);
    const duplicate = players.find((p) => nameKey(p.name) === key);
    if (duplicate) {
      setNotice(`"${duplicate.name}" is already on the roster.`);
      return;
    }

    // Add, but flag a likely nickname/partial match (e.g. "Bo" vs "Bohrod")
    // instead of silently merging — two different people can share a prefix.
    const possibleMatch = players.find((p) => isPossibleNicknameOf(name, p.name));
    setPlayers((cur) => [
      ...cur,
      { id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name },
    ]);
    setNewName("");
    if (possibleMatch) {
      setNotice(
        `Added "${name}". Heads up — "${possibleMatch.name}" is already on the roster; remove one if they're the same player.`,
      );
    }
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
    <>
      <div className="rs-roster__head">
        <div className="eyebrow">
          <span className="eyebrow__text">[ ROSTER ]</span>
        </div>
        <div className="rs-roster__count">
          <span className="num">{String(players.length).padStart(2, "0")}</span>
          PLAYERS · UDISC
        </div>
      </div>

      {players.length > 0 ? (
        <ul className="roster-list">
          {players.map((p, i) => (
            <li key={p.id} className="roster-row">
              <span className="roster-row__num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="roster-row__name">{p.name}</span>
              <button
                type="button"
                className="roster-row__remove"
                onClick={() => removePlayer(p.id)}
                aria-label={`Remove ${p.name}`}
              >
                REMOVE
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="roster-empty">No players yet — add a walk-in below.</div>
      )}

      <form onSubmit={addPlayer} className="walkin">
        <div className="walkin__label">
          <span className="walkin__plus">[+]</span> ADD WALK-IN
        </div>
        <div className="walkin__row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="walkin__input"
          />
          <button type="submit" className="walkin__btn">
            Add
          </button>
        </div>
        {notice && <p className="walkin__notice">{notice}</p>}
      </form>

      <div className="rs-cta-wrap">
        <button
          type="button"
          onClick={onRandomize}
          className="cta"
          disabled={players.length < 3}
        >
          <span className="cta__label">
            <span className="cta__arrow">▸</span>
            Randomize pairings
          </span>
          <span className="cta__count">
            {String(players.length).padStart(2, "0")}
          </span>
        </button>
        <div className="cta-sub">
          Min 3 players. Cards of 4 + a cali on any short card (1 mulligan/hole).
        </div>
        {error && <p className="cta-error">{error}</p>}
      </div>
    </>
  );
}
