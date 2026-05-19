import * as cheerio from "cheerio";
import { USER_AGENT } from "./league";

export class LeaderboardScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaderboardScrapeError";
  }
}

export type TeamResult = {
  place: number;
  totalScore: number;
  players: string[];
};

export type LeaderboardResult = {
  slug: string;
  eventName: string | null;
  teams: TeamResult[];
};

export async function fetchLeaderboard(
  slug: string,
): Promise<LeaderboardResult> {
  const url = `https://udisc.com/events/${slug}/leaderboard?round=1&view=scores`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new LeaderboardScrapeError(
      `Network error fetching UDisc leaderboard for ${slug}: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new LeaderboardScrapeError(
      `UDisc leaderboard returned HTTP ${res.status} for ${slug}.`,
    );
  }

  const html = await res.text();
  return parseLeaderboard(slug, html);
}

export function parseLeaderboard(
  slug: string,
  html: string,
): LeaderboardResult {
  const $ = cheerio.load(html);

  const titleText = $("title").first().text();
  const eventName = extractEventName(titleText);

  const teams: TeamResult[] = [];

  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const playerSpans = $tr.find("span.text-wrap.text-start");
    if (playerSpans.length === 0) return;

    const players = playerSpans
      .map((_, s) => $(s).text().trim())
      .get()
      .filter((n) => n.length > 0);
    if (players.length === 0) return;

    const $tds = $tr.find("td");
    if ($tds.length < 3) return;

    const placeRaw = $tds.eq(0).text().trim();
    const placeMatch = placeRaw.match(/(\d+)/);
    if (!placeMatch) return;
    const place = parseInt(placeMatch[1], 10);

    let totalScore: number | null = null;
    for (let i = 2; i < $tds.length; i++) {
      const cellText = $tds.eq(i).text().trim();
      if (/^[+-]?\d+$/.test(cellText)) {
        totalScore = parseInt(cellText, 10);
        break;
      }
      if (cellText === "E") {
        totalScore = 0;
        break;
      }
    }
    if (totalScore === null) return;

    teams.push({ place, totalScore, players });
  });

  if (teams.length === 0) {
    throw new LeaderboardScrapeError(
      `No leaderboard rows parsed from ${slug}. UDisc may have changed their markup.`,
    );
  }

  teams.sort((a, b) => a.place - b.place || a.totalScore - b.totalScore);

  return { slug, eventName, teams };
}

function extractEventName(title: string): string | null {
  if (!title) return null;
  const parts = title.split("|").map((p) => p.trim());
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) return parts[0];
  return title.trim() || null;
}
