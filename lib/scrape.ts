import * as cheerio from "cheerio";
import { z } from "zod";
import type { Player, ScrapeResult } from "./types";
import { parseUdiscInput } from "./url";

export class EventNotFoundError extends Error {
  constructor(slug: string) {
    super(`UDisc event "${slug}" not found (404).`);
    this.name = "EventNotFoundError";
  }
}

export class EmptyRosterError extends Error {
  constructor() {
    super("Event page loaded but no participants were listed.");
    this.name = "EmptyRosterError";
  }
}

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PLAYER_NAME_SELECTORS = [
  "p.mb-1.leading-none",
  "div.font-bold.text-sm.text-text.leading-tight",
];

const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export async function fetchParticipants(input: string): Promise<ScrapeResult> {
  const parsed = parseUdiscInput(input);
  if (!parsed) {
    throw new ScrapeError(
      "Could not parse input as a UDisc event URL or slug.",
    );
  }
  const { slug, participantsUrl } = parsed;

  let res: Response;
  try {
    res = await fetch(participantsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new ScrapeError(
      `Network error fetching UDisc: ${(err as Error).message}`,
    );
  }

  if (res.status === 404) throw new EventNotFoundError(slug);
  if (!res.ok) {
    throw new ScrapeError(`UDisc returned HTTP ${res.status}.`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const titleText = $("title").first().text();
  const eventName = extractEventName(titleText) ?? slug;

  let names: string[] = [];
  for (const selector of PLAYER_NAME_SELECTORS) {
    names = $(selector)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((n) => n.length > 0);
    if (names.length > 0) break;
  }

  if (names.length === 0) {
    names = extractFromStreamingData($);
  }

  if (names.length === 0) {
    throw new EmptyRosterError();
  }

  const seen = new Set<string>();
  const players: Player[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({ id: slugifyId(name), name });
  }

  const validated = z.array(playerSchema).parse(players);
  return { slug, eventName, players: validated };
}

function extractEventName(title: string): string | null {
  if (!title) return null;
  const parts = title.split("|").map((p) => p.trim());
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) return parts[0];
  return title.trim() || null;
}

function slugifyId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 6)
  );
}

const NAME_RE = /^[A-Z][a-z]+([ '-][A-Z]?[a-z]+)+\.?$/;
const SKIP_RE = /^https?:|^event_|^league-|_t_player_|\.jpg$|\.png$|@|^\d{4}-\d{2}/;

function extractFromStreamingData($: cheerio.CheerioAPI): string[] {
  let jsonStr = "";
  $("script").each((_, el) => {
    const text = $(el).text();
    const match = text.match(
      /streamController\.enqueue\("(.+?)"\);/,
    );
    if (match) jsonStr = match[1];
  });
  if (!jsonStr) return [];

  let arr: unknown[];
  try {
    const unescaped = jsonStr
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n");
    arr = JSON.parse(unescaped) as unknown[];
  } catch {
    return [];
  }

  const regIdx = arr.indexOf("confirmedUserRegistrants");
  if (regIdx === -1) return [];
  const indices = arr[regIdx + 1];
  if (!Array.isArray(indices)) return [];

  const names: string[] = [];
  for (const idx of indices) {
    if (typeof idx !== "number" || idx >= arr.length) continue;
    const obj = arr[idx];
    if (typeof obj !== "object" || obj === null) continue;

    for (const val of Object.values(obj)) {
      if (typeof val !== "number" || val >= arr.length) continue;
      const resolved = arr[val];
      if (typeof resolved !== "string") continue;
      const trimmed = resolved.trim();
      if (trimmed.length < 2 || trimmed.length > 60) continue;
      if (SKIP_RE.test(trimmed)) continue;
      if (NAME_RE.test(trimmed)) {
        names.push(trimmed);
        break;
      }
    }
  }

  return names;
}
