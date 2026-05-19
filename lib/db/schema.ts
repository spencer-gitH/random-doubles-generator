import {
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const seasons = pgTable("seasons", {
  id: text("id").primaryKey(),
  leagueSlug: text("league_slug").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
});

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playerAliases = pgTable("player_aliases", {
  alias: text("alias").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => seasons.id),
  eventDate: date("event_date").notNull(),
  name: text("name"),
  course: text("course"),
  teamCount: integer("team_count").notNull(),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  place: integer("place").notNull(),
  totalScore: integer("total_score").notNull(),
  size: integer("size").notNull(),
});

export const teamPlayers = pgTable(
  "team_players",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teamId, t.playerId] }),
  }),
);

export const points = pgTable(
  "points",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    points: numeric("points", { precision: 5, scale: 1 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.eventId, t.playerId] }),
  }),
);

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  ranAt: timestamp("ran_at", { withTimezone: true }).defaultNow().notNull(),
  trigger: text("trigger").notNull(),
  eventsAdded: integer("events_added").notNull().default(0),
  eventsSkipped: integer("events_skipped").notNull().default(0),
  status: text("status").notNull(),
  error: text("error"),
});

export type Season = typeof seasons.$inferSelect;
export type Player = typeof players.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type PointsRow = typeof points.$inferSelect;
