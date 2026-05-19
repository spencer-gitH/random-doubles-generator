import * as cheerio from "cheerio";
import { LEAGUE, USER_AGENT } from "./league";

export class LeagueScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeagueScheduleError";
  }
}

export type LeagueEventStub = {
  slug: string;
  eventDate: string;
};

export async function fetchLeagueEvents(opts: {
  since?: Date;
  until?: Date;
} = {}): Promise<LeagueEventStub[]> {
  const seen = new Set<string>();
  const collected: LeagueEventStub[] = [];

  let page = 1;
  const maxPages = 20;

  while (page <= maxPages) {
    const url = `${LEAGUE.scheduleUrl}?status=past&canceledEvents=include&page=${page}`;
    const html = await fetchPage(url);
    const pageEvents = parseSchedulePage(html);

    if (pageEvents.length === 0) break;

    let newOnPage = 0;
    for (const ev of pageEvents) {
      if (seen.has(ev.slug)) continue;
      seen.add(ev.slug);
      newOnPage++;
      const eventDate = new Date(`${ev.eventDate}T00:00:00Z`);
      if (opts.since && eventDate < opts.since) continue;
      if (opts.until && eventDate > opts.until) continue;
      collected.push(ev);
    }

    if (newOnPage === 0) break;
    page++;
  }

  collected.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return collected;
}

async function fetchPage(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new LeagueScheduleError(
      `Network error fetching UDisc schedule: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new LeagueScheduleError(
      `UDisc schedule returned HTTP ${res.status}.`,
    );
  }
  return res.text();
}

function parseSchedulePage(html: string): LeagueEventStub[] {
  const $ = cheerio.load(html);
  const events: LeagueEventStub[] = [];

  $('a[href^="/events/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (!href.includes("/leaderboard")) return;

    const match = href.match(/^\/events\/([^/?#]+)/);
    if (!match) return;
    const slug = match[1];

    const datetime = $a.find("time").attr("datetime");
    if (!datetime) return;

    const eventDate = datetime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return;

    events.push({ slug, eventDate });
  });

  return events;
}
