import { and, eq, gte, lte } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "./db";
import {
  events,
  points as pointsTable,
  seasons,
  syncLog,
  teamPlayers,
  teams,
} from "./db/schema";
import { LEAGUE } from "./league";
import { fetchLeaderboard } from "./leagueLeaderboard";
import { fetchLeagueEvents } from "./leagueSchedule";
import { computePoints } from "./points";
import { resolvePlayer } from "./playerResolver";

export type SyncTrigger = "cron" | "backfill" | "manual";

export type SyncReport = {
  status: "ok" | "partial" | "failed";
  eventsAdded: number;
  eventsSkipped: number;
  newPlayers: string[];
  errors: string[];
  syncLogId: number;
};

export async function syncSeason(
  seasonId: string,
  opts: {
    since?: Date;
    until?: Date;
    trigger: SyncTrigger;
  },
): Promise<SyncReport> {
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (seasonRows.length === 0) {
    throw new Error(`Season "${seasonId}" not seeded — run scripts/seed.ts.`);
  }
  const season = seasonRows[0];

  const since = opts.since ?? new Date(`${season.startDate}T00:00:00Z`);
  const until =
    opts.until ?? (season.endDate ? new Date(`${season.endDate}T23:59:59Z`) : new Date());

  const scheduleStubs = await fetchLeagueEvents({ since, until });

  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.seasonId, seasonId),
        gte(events.eventDate, season.startDate),
        season.endDate ? lte(events.eventDate, season.endDate) : undefined,
      ),
    );
  const existingSet = new Set(existing.map((e) => e.id));

  let added = 0;
  let skipped = 0;
  const newPlayerIds: string[] = [];
  const errors: string[] = [];

  for (const stub of scheduleStubs) {
    if (existingSet.has(stub.slug)) {
      skipped++;
      continue;
    }

    try {
      const leaderboard = await fetchLeaderboard(stub.slug);

      await db.transaction(async (tx) => {
        await tx.insert(events).values({
          id: stub.slug,
          seasonId,
          eventDate: stub.eventDate,
          name: leaderboard.eventName,
          course: LEAGUE.course,
          teamCount: leaderboard.teams.length,
        });

        const resolvedTeams: Array<{
          dbTeamId: number;
          score: number;
          playerIds: string[];
        }> = [];

        for (const team of leaderboard.teams) {
          const [inserted] = await tx
            .insert(teams)
            .values({
              eventId: stub.slug,
              place: team.place,
              totalScore: team.totalScore,
              size: team.players.length,
            })
            .returning({ id: teams.id });

          const playerIds: string[] = [];
          for (const playerName of team.players) {
            const { id: playerId, isNew } = await resolvePlayer(tx, playerName);
            if (isNew) newPlayerIds.push(playerId);
            await tx
              .insert(teamPlayers)
              .values({ teamId: inserted.id, playerId })
              .onConflictDoNothing();
            playerIds.push(playerId);
          }

          resolvedTeams.push({
            dbTeamId: inserted.id,
            score: team.totalScore,
            playerIds,
          });
        }

        const teamPoints = computePoints(resolvedTeams);

        for (const tp of teamPoints) {
          for (const playerId of tp.playerIds) {
            await tx
              .insert(pointsTable)
              .values({
                eventId: stub.slug,
                playerId,
                teamId: tp.dbTeamId,
                points: tp.points.toString(),
              })
              .onConflictDoNothing();
          }
        }
      });

      added++;
    } catch (err) {
      const message = `${stub.slug}: ${(err as Error).message}`;
      errors.push(message);
      console.error(`[sync] failed for ${stub.slug}:`, err);
    }
  }

  const status: SyncReport["status"] =
    errors.length === 0 ? "ok" : added > 0 ? "partial" : "failed";

  const [logRow] = await db
    .insert(syncLog)
    .values({
      trigger: opts.trigger,
      eventsAdded: added,
      eventsSkipped: skipped,
      status,
      error: errors.length > 0 ? errors.join("; ").slice(0, 2000) : null,
    })
    .returning({ id: syncLog.id });

  if (added > 0) {
    try {
      revalidateTag(`standings:${seasonId}`, { expire: 0 });
    } catch {
      // revalidateTag is a no-op outside request scope (e.g. script invocations)
    }
  }

  return {
    status,
    eventsAdded: added,
    eventsSkipped: skipped,
    newPlayers: newPlayerIds,
    errors,
    syncLogId: logRow.id,
  };
}
