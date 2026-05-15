import type { Assignment, Card, Player, Team } from "./types";
import { computeCardSizes, exceedsHoleLimit } from "./cards";

export class TooFewPlayersError extends Error {
  constructor(count: number) {
    super(`Need at least 3 players; got ${count}.`);
    this.name = "TooFewPlayersError";
  }
}

export class TooManyPlayersError extends Error {
  constructor(cardCount: number) {
    super(
      `${cardCount} cards exceeds 9 starting holes. Manual grouping needed.`,
    );
    this.name = "TooManyPlayersError";
  }
}

export function generateAssignments(players: Player[]): Assignment {
  if (players.length < 3) throw new TooFewPlayersError(players.length);

  const sizes = computeCardSizes(players.length);
  if (exceedsHoleLimit(sizes.length)) {
    throw new TooManyPlayersError(sizes.length);
  }

  const shuffled = fisherYates(players);

  const caliNeeded = players.length % 4 === 1 || players.length % 4 === 3;
  const cali = caliNeeded ? shuffled.pop()! : null;

  const teams: Team[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    teams.push({
      id: `team-${i / 2}`,
      players: [shuffled[i], shuffled[i + 1]],
    });
  }
  const shuffledTeams = fisherYates(teams);

  const cards: Card[] = sizes.map((size, idx) => {
    const card: Card = { hole: idx + 1, size, teams: [], cali: null };
    if (size === 4) card.teams = shuffledTeams.splice(0, 2);
    else if (size === 5) {
      card.teams = shuffledTeams.splice(0, 2);
      card.cali = cali;
    } else if (size === 6) card.teams = shuffledTeams.splice(0, 3);
    else if (size === 3) {
      card.teams = shuffledTeams.splice(0, 1);
      card.cali = cali;
    }
    return card;
  });

  return { cards, generatedAt: new Date().toISOString() };
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
