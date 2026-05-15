import * as cheerio from "cheerio";
import { z } from "zod";
import type { EventSummary } from "./types";

export class EventsScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventsScrapeError";
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const eventSchema = z.object({
  slug: z.string().min(1),
  seriesName: z.string(),
  weekLabel: z.string().nullable(),
  type: z.string().nullable(),
  courseName: z.string().nullable(),
  cityState: z.string().nullable(),
  date: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export async function fetchTodaysEvents(
  radiusMiles: number = 100,
): Promise<EventSummary[]> {
  const url = `https://udisc.com/events?quickFilter=all&searchRadius=${radiusMiles}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 60 },
    });
  } catch (err) {
    throw new EventsScrapeError(
      `Network error fetching UDisc events: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new EventsScrapeError(`UDisc returned HTTP ${res.status}.`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const events: EventSummary[] = [];
  $('a[href^="/events/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (href.startsWith("/events/add")) return;

    const slug = href.replace(/^\/events\//, "").split(/[?#]/)[0];
    if (!slug) return;

    const seriesName = $a.find("div.text-sm.text-subtle").first().text().trim();
    const titleContainer = $a
      .find("div.text-sm.text-subtle")
      .first()
      .parent();
    const weekLabel =
      titleContainer.children("div").not(".text-sm").first().text().trim() ||
      null;

    const type = $a.find("div.text-primary").first().text().trim() || null;

    const locDiv = $a
      .find('svg[data-icon="location-dot"]')
      .parent()
      .find("div div")
      .first();
    const locText = locDiv.text().trim();
    let courseName: string | null = null;
    let cityState: string | null = null;
    if (locText.includes(" • ")) {
      const [c, cs] = locText.split(" • ");
      courseName = c.trim();
      cityState = cs.trim();
    } else if (locText) {
      courseName = locText;
    }

    const dateAttr = $a.find("time").first().attr("datetime") || null;

    const styleAttr = $a.find('div[style*="background-image"]').first().attr(
      "style",
    );
    let imageUrl: string | null = null;
    if (styleAttr) {
      const m = styleAttr.match(/background-image:\s*url\(([^)]+)\)/i);
      if (m) imageUrl = m[1].replace(/^["']|["']$/g, "");
    }

    events.push({
      slug,
      seriesName,
      weekLabel,
      type,
      courseName,
      cityState,
      date: dateAttr,
      imageUrl,
    });
  });

  const validated = z.array(eventSchema).parse(events);

  const today = todayKey();
  const todayEvents = validated.filter(
    (e) => e.date && isoDateKey(e.date) === today,
  );

  return dedupeBySlug(todayEvents);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dedupeBySlug(events: EventSummary[]): EventSummary[] {
  const seen = new Set<string>();
  const out: EventSummary[] = [];
  for (const e of events) {
    if (seen.has(e.slug)) continue;
    seen.add(e.slug);
    out.push(e);
  }
  return out;
}
