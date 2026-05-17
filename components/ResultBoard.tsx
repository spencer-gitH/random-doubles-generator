"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Assignment, Player } from "@/lib/types";
import {
  generateAssignments,
  TooFewPlayersError,
  TooManyPlayersError,
} from "@/lib/randomize";
import Eyebrow from "./Eyebrow";

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
      <main className="screen state-center">
        <Eyebrow rule hot>
          [ DRAWING ]
        </Eyebrow>
        <p className="state-body">Shuffling field…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="screen state-center">
        <Eyebrow rule hot>
          [ DRAW FAILED ]
        </Eyebrow>
        <p className="state-body">{error}</p>
        <Link href={`/event/${slug}`} className="back-btn">
          ← Roster
        </Link>
      </main>
    );
  }

  if (!assignment) return null;

  const totalPlayers = assignment.cards.reduce(
    (acc, c) => acc + c.size,
    0,
  );

  return (
    <main className="screen screen--results">
      <header className="rs-header--sticky">
        <Link href={`/event/${slug}`} className="back-btn">
          ← Roster
        </Link>
        <button type="button" onClick={roll} className="redraw-btn">
          ⟲ Re-draw
        </button>
      </header>

      <div className="results-body">
        <div className="results-hero">
          <Eyebrow rule={false} hot>
            [ THE DRAW · TODAY ]
          </Eyebrow>
          <h1 className="results-title">The Draw</h1>
          <div className="results-meta">
            <span>{String(totalPlayers).padStart(2, "0")} PLAYERS</span>
            <span className="dot">/</span>
            <span>
              {String(assignment.cards.length).padStart(2, "0")} CARDS
            </span>
            <span className="dot">/</span>
            <span>Shotgun start</span>
          </div>
        </div>

        <ol className="cards">
          {assignment.cards.map((card, ci) => (
            <li key={`${card.hole}-${ci}`} className="card-row">
              <header className="card-row__head">
                <div className="card-row__hole">
                  <span className="card-row__hole-pre">HOLE</span>
                  <span className="card-row__hole-num">
                    {String(card.hole).padStart(2, "0")}
                  </span>
                </div>
                <div className="card-row__size">{card.size} PLR</div>
              </header>
              <div className="card-row__body">
                {card.teams.map((team, ti) => (
                  <div key={team.id} className="team">
                    <div className="team__label">
                      <span className="team__label-tag">
                        TEAM {String.fromCharCode(65 + ti)}
                      </span>
                    </div>
                    <div className="team__names">
                      <span>{team.players[0].name}</span>
                      <span className="team__amp">+</span>
                      <span>{team.players[1].name}</span>
                    </div>
                  </div>
                ))}
                {card.cali && (
                  <div className="cali">
                    <div className="cali__label">
                      <span className="team__label-tag cali__label-tag">
                        CALI
                      </span>
                      <span className="cali__pip">+1 MULL / HOLE</span>
                    </div>
                    <div className="cali__name">{card.cali.name}</div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="results-footer">
          <div className="footer-text">
            GOOD LUCK · TEE OFF AT MARKED HOLES
          </div>
        </div>
      </div>
    </main>
  );
}
