# Random Doubles Generator

A single-operator webapp for running a weekly disc golf doubles league. It
fetches the participant list from a UDisc event, randomizes doubles teams,
and assigns shotgun starting holes — replacing the manual "copy names from
UDisc into an Excel randomizer" workflow.

The home page lists nearby events scheduled for today, scraped from UDisc.
Tap one to load its roster, edit it if needed, then hit Randomize.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- [cheerio](https://cheerio.js.org/) for HTML scraping
- [Zod](https://zod.dev/) for input validation
- No database — state lives in `sessionStorage` keyed by event slug

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
  page.tsx                       # home: today's UDisc events list
  event/[slug]/page.tsx          # roster review (server-fetches participants)
  event/[slug]/randomize/page.tsx # randomized result (client component)
components/
  EventCard.tsx                  # event list card
  PasteUrlFallback.tsx           # paste-URL form (used when list is empty)
  RosterEditor.tsx               # add / remove / randomize controls
  ResultBoard.tsx                # card display + re-randomize
lib/
  searchEvents.ts                # scrape UDisc events search page
  scrape.ts                      # scrape UDisc participants page
  cards.ts                       # deterministic card-size algorithm
  randomize.ts                   # shuffle, team formation, hole assignment
  url.ts                         # parse UDisc URLs / slugs
  types.ts                       # shared TypeScript types
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

## Out of scope (intentionally)

This is an MVP. The following are deliberately not implemented and require
deliberate design decisions before adding:

- Persistent storage of events, players, or pairings
- Score tracking (UDisc handles this; their leaderboard pages are scrapable)
- Attendance / season points / leaderboard
- Skill-balanced pairings; avoid-recent-partner logic
- Multi-user auth
