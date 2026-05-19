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

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

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
    let eventDate: string | null = null;

    if (datetime) {
      const iso = datetime.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) eventDate = iso;
    }

    if (!eventDate) {
      const monthRaw = $a.find("div.uppercase").first().text().trim().toUpperCase();
      const dayRaw = $a
        .find("div")
        .filter((_, d) => /^\d{1,2}$/.test($(d).text().trim()))
        .first()
        .text()
        .trim();
      const yearText = $a
        .find("span")
        .filter((_, s) => /^(20\d{2})$/.test($(s).text().trim()))
        .first()
        .text()
        .trim();
      const yearFallback = $a.text().match(/(?:^|\D)(20\d{2})(?:\D|$)/);
      const year = yearText
        ? parseInt(yearText, 10)
        : yearFallback
        ? parseInt(yearFallback[1], 10)
        : null;
      const month = MONTHS[monthRaw.slice(0, 3)];
      const day = parseInt(dayRaw, 10);

      if (year && month && day) {
        eventDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    if (!eventDate) return;
    events.push({ slug, eventDate });
  });

  return events;
}
