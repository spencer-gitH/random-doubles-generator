import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { events, players, points } from "./db/schema";

export type StandingsEvent = {
  id: string;
  eventDate: string;
  matchNo: number;
};

export type StandingsRow = {
  playerId: string;
  displayName: string;
  totalPoints: number;
  eventsPlayed: number;
  pointsByEvent: Record<string, number>;
};

export type StandingsData = {
  events: StandingsEvent[];
  rows: StandingsRow[];
  lastSynced: string | null;
};

export const getStandings = (seasonId: string) =>
  unstable_cache(
    async (): Promise<StandingsData> => {
      const seasonEvents = await db
        .select({
          id: events.id,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(eq(events.seasonId, seasonId))
        .orderBy(asc(events.eventDate));

      const indexedEvents: StandingsEvent[] = seasonEvents.map((e, i) => ({
        id: e.id,
        eventDate: e.eventDate,
        matchNo: i + 1,
      }));

      const pointRows = await db
        .select({
          playerId: points.playerId,
          eventId: points.eventId,
          points: points.points,
          displayName: players.displayName,
        })
        .from(points)
        .innerJoin(events, eq(events.id, points.eventId))
        .innerJoin(players, eq(players.id, points.playerId))
        .where(eq(events.seasonId, seasonId));

      const byPlayer = new Map<
        string,
        {
          displayName: string;
          total: number;
          byEvent: Record<string, number>;
        }
      >();

      for (const row of pointRows) {
        const pts = Number(row.points);
        const existing = byPlayer.get(row.playerId);
        if (existing) {
          existing.total += pts;
          existing.byEvent[row.eventId] = pts;
        } else {
          byPlayer.set(row.playerId, {
            displayName: row.displayName,
            total: pts,
            byEvent: { [row.eventId]: pts },
          });
        }
      }

      const rows: StandingsRow[] = Array.from(byPlayer.entries()).map(
        ([playerId, agg]) => ({
          playerId,
          displayName: agg.displayName,
          totalPoints: round1(agg.total),
          eventsPlayed: Object.keys(agg.byEvent).length,
          pointsByEvent: agg.byEvent,
        }),
      );

      rows.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.eventsPlayed !== a.eventsPlayed) return b.eventsPlayed - a.eventsPlayed;
        return a.displayName.localeCompare(b.displayName);
      });

      return {
        events: indexedEvents,
        rows,
        lastSynced: null,
      };
    },
    [`standings-${seasonId}`],
    { tags: [`standings:${seasonId}`], revalidate: 3600 },
  );

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function rankRows(
  rows: StandingsRow[],
): Array<StandingsRow & { rank: number }> {
  const out: Array<StandingsRow & { rank: number }> = [];
  let lastPoints = -Infinity;
  let lastRank = 0;
  let i = 0;
  for (const row of rows) {
    i++;
    if (row.totalPoints !== lastPoints) {
      lastRank = i;
      lastPoints = row.totalPoints;
    }
    out.push({ ...row, rank: lastRank });
  }
  return out;
}
