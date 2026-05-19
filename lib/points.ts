export type ScoredTeam<T extends { score: number }> = T;
export type TeamPoints<T> = T & { points: number };

export function computePoints<T extends { score: number }>(
  teams: T[],
): TeamPoints<T>[] {
  if (teams.length === 0) return [];
  const lowestScore = Math.min(...teams.map((t) => t.score));

  return teams.map((team, idx) => {
    const winnerPts = team.score === lowestScore ? 1 : 0;
    const attendancePts = 1;
    let vsPts = 0;
    for (let i = 0; i < teams.length; i++) {
      if (i === idx) continue;
      const other = teams[i];
      if (team.score < other.score) vsPts += 1;
      else if (team.score === other.score) vsPts += 0.5;
    }
    return { ...team, points: winnerPts + attendancePts + vsPts };
  });
}
