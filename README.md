# Random Doubles Generator

A single-operator webapp for running a weekly disc golf doubles league. It
fetches the participant list from a UDisc event, randomizes doubles teams,
and assigns shotgun starting holes — replacing the manual "copy names from
UDisc into an Excel randomizer" workflow.

The home page lists nearby events scheduled for today, scraped from UDisc.
Tap one to load its roster, edit it if needed, then hit Randomize.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- [cheerio](https://cheerio.js.org/) for HTML scraping
- [Zod](https://zod.dev/) for input validation
- Vercel Postgres (Neon) + [Drizzle ORM](https://orm.drizzle.team) for season standings persistence
- Vercel Cron for weekly UDisc sync (Thursday 13:00 UTC)
- Day-of randomizer state still lives in `sessionStorage` keyed by event slug — only league standings are persisted

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The home page lists today's nearby UDisc events.

## Domain rules

These rules are baked into the randomizer:

- 9-hole course played twice (18 holes total). Shotgun starts on **holes 1–9 only**.
- Doubles teams = 2 players. Odd player out = "Cali" — solo player with **1 mulligan per hole**.
- Card sizing is fully determined by `playerCount % 4`:
  - mod 0 → all cards of 4
  - mod 1 → one card of 5 (2 teams + Cali), rest of 4
  - mod 2 → one card of 6 (3 teams), rest of 4
  - mod 3 → one card of 3 (1 team + Cali), rest of 4
- Cali is folded into the 5-card or 3-card, never appended after the fact.
- Hole assignment is positional, not random: largest card → Hole 1; 3-card (if present) → last used hole; rest in between.
- Only team membership and player-to-team assignment are random. Card structure and hole numbering are deterministic.

## Project layout

```
app/
  page.tsx                          # home: today's UDisc events list
  standings/page.tsx                # season standings scoreboard
  event/[slug]/page.tsx             # roster review (server-fetches participants)
  event/[slug]/randomize/page.tsx   # randomized result (client component)
  api/cron/sync/route.ts            # Vercel Cron entry (Thursday 13:00 UTC)
  api/admin/backfill/route.ts       # one-time / manual season backfill
components/
  EventCard.tsx                     # event list card
  PasteUrlFallback.tsx              # paste-URL form (used when list is empty)
  RosterEditor.tsx                  # add / remove / randomize controls
  ResultBoard.tsx                   # card display + re-randomize
lib/
  searchEvents.ts                   # scrape UDisc events search page
  scrape.ts                         # scrape UDisc participants page
  leagueSchedule.ts                 # scrape one league's past-events index
  leagueLeaderboard.ts              # scrape one event's final leaderboard
  league.ts                         # league config (slug, season id)
  points.ts                         # pure points-formula function
  playerResolver.ts                 # canonical-player lookup + alias resolution
  sync.ts                           # idempotent backfill / incremental sync pipeline
  standings.ts                      # cached DB query for the scoreboard
  formatName.ts                     # "Spencer Nightingale" -> "NIGHTINGALE S."
  db/schema.ts                      # Drizzle schema (8 tables)
  db/index.ts                       # Neon WebSocket pool + Drizzle client
  cards.ts                          # deterministic card-size algorithm
  randomize.ts                      # shuffle, team formation, hole assignment
  url.ts                            # parse UDisc URLs / slugs
  types.ts                          # shared TypeScript types
drizzle/
  0000_init.sql                     # initial schema migration
scripts/
  seed.ts                           # one-shot season seed + known aliases
vercel.json                         # cron schedule
```

## Deploying to Vercel

The home page scrapes UDisc, which **geolocates strictly by the connecting IP**
— URL coordinates and `X-Forwarded-For` are ignored. To make the deployed
app return events near the league's actual location, the home page pins
itself to Vercel's `iad1` region (Ashburn, VA):

```ts
// app/page.tsx
export const preferredRegion = "iad1";
```

Combined with `searchRadius=100`, this surfaces events anywhere within ~100
miles of northern Virginia. If you fork this for a different region, change
`preferredRegion` to your nearest [Vercel region](https://vercel.com/docs/edge-network/regions)
and adjust the radius accordingly.

## Scraping notes

- **Participants page** (`/events/{slug}/participants`): player names come from
  `p.mb-1.leading-none`; event title from the document `<title>`.
- **Events search page** (`/events?quickFilter=all&searchRadius=N`): each event
  is an `a[href^="/events/"]`; ISO date is read from `time[datetime]`
  (not the visible text — much more robust).
- Always send a realistic `User-Agent`; default Node UAs may be blocked.
- If a scraper breaks, the most likely cause is UDisc tweaking those
  selectors. The paste-URL fallback keeps the app usable while you fix them.

## Season standings

The `/standings` page shows the live season points leaderboard for **Gallaudet
Wednesday Doubles**. Each Wednesday's UDisc leaderboard is scraped automatically
by a Vercel Cron job the following Thursday morning, run through the points
formula, and persisted in Vercel Postgres. The scoreboard is laid out
Masters-style: sticky POS / PTS / PLAYER columns and one column per match.

### Points formula

For every event:

- `+1` if your team finished 1st (or is tied for 1st) — *winner bonus*
- `+1` just for playing — *attendance*
- For each other team in the field:
  - your team scored **lower** → `+1` (you bested them)
  - your team **tied** → `+0.5`
  - your team scored **higher** → `+0`
- Each player on a team receives the team's total. For Cali (1-person team), only that player gets it.

Half-point precision is preserved in the DB (`numeric(5,1)`).

### Database setup (one-time)

1. **Provision Vercel Postgres**: Vercel dashboard → Storage → Create → Postgres → connect to this project. Vercel auto-injects `POSTGRES_URL` and friends.
2. **Add the cron secret**: dashboard → Settings → Environment Variables → add `CRON_SECRET` (any high-entropy string, e.g. `openssl rand -hex 32`).
3. **Pull env locally**: `vercel env pull .env.local`
4. **Apply schema**: `npx drizzle-kit migrate`
5. **Seed the season + known aliases**: `npx tsx scripts/seed.ts`

### Manual backfill (one-time)

After deploying, hit the backfill endpoint to ingest every past event in the season:

```bash
curl -X POST https://<your-host>/api/admin/backfill \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

The response includes `eventsAdded`, `newPlayers` (canonical IDs created), and any per-event errors. Compare the resulting `/standings` totals against the manual Google Sheet — discrepancies are usually sheet entry errors.

### Cron

`vercel.json` schedules `/api/cron/sync` at `0 13 * * 4` — Thursday 13:00 UTC (~8–9am ET, ±59 min per Vercel's Hobby plan). The cron is idempotent: re-running doesn't duplicate events. After every run, a row is inserted into `sync_log` with status, counts, and any error messages.

### Player name normalization

Player names come from UDisc accounts and are canonical. Two known aliases are pre-seeded:

- `"Bohrod"` (UDisc) → `Ryan "Bo" Bohrod` (display)
- `"Kev"` (sheet abbreviation) → `Kevin Dardick`

If UDisc ever renders a known player under a new name variant during a cron run, the sync's `newPlayers` array will include the unexpected new canonical id — that's the signal to add an alias row manually:

```sql
INSERT INTO player_aliases (alias, player_id) VALUES ('new variant name', 'canonical-id');
```

## Out of scope (intentionally)

- Persistent storage of randomizer outputs (day-of pairings are still session-scoped)
- Hole-by-hole stats (most birdies, worst hole) — the schema leaves room for a `team_hole_scores` table when desired
- Skill-balanced pairings; avoid-recent-partner logic
- Multi-user auth (the standings page is a public read-only URL)
