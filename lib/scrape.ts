import * as cheerio from "cheerio";
import { z } from "zod";
import type { Player, ScrapeResult } from "./types";
import { nameKey } from "./nameKey";
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
  return parseParticipants(html, slug);
}

/**
 * Pure parse of a UDisc participants page. Separated from the network fetch so
 * it can be exercised directly against saved HTML in tests.
 *
 * Two extraction paths, tried in order:
 *  1. Server-rendered name nodes (CSS selectors) — no name filtering needed.
 *  2. Client-rendered React Flight stream — names live in a serialized data
 *     blob; {@link extractFromStreamingData} reconstructs them.
 */
export function parseParticipants(html: string, slug: string): ScrapeResult {
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
  for (const rawName of names) {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
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

// A full personal name: two or more capitalized, mostly-alphabetic tokens
// (e.g. "Phil Pingeton", "Mary Anne Smith"). Used to *locate* which registrant
// field holds the display name — NOT to validate individual names, so that
// single-token display names (e.g. "Bohrod") are not rejected.
const FULL_NAME_RE = /^\p{Lu}[\p{L}'’.-]*(?:\s+\p{L}[\p{L}'’.-]*)+$/u;

// A usable display-name value once the name field has been identified. Starts
// with an uppercase letter and contains only letters, marks, spaces and name
// punctuation. Accepts single-token names like "Bohrod" that FULL_NAME_RE
// deliberately does not.
const NAME_VALUE_RE = /^\p{Lu}[\p{L}\p{M}'’. -]*$/u;

const SKIP_RE = /^https?:|^event_|^league-|_t_player_|\.jpg$|\.png$|@|^\d{4}-\d{2}/;

function extractFromStreamingData($: cheerio.CheerioAPI): string[] {
  let jsonStr = "";
  $("script").each((_, el) => {
    const text = $(el).text();
    const match = text.match(/streamController\.enqueue\("(.+?)"\);/);
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

  // Collect each registrant's candidate string fields, keyed by the object's
  // own (minified) field key. The blob deduplicates strings, so each object
  // value is an index back into `arr`. UDisc uses the same minified key for the
  // same field across every registrant on a page, which lets us detect *which*
  // field holds the display name rather than guessing per-field.
  const registrants: Array<Map<string, string>> = [];
  for (const idx of indices) {
    if (typeof idx !== "number" || idx < 0 || idx >= arr.length) continue;
    const obj = arr[idx];
    if (typeof obj !== "object" || obj === null) continue;

    const fields = new Map<string, string>();
    for (const [key, ref] of Object.entries(obj)) {
      if (typeof ref !== "number" || ref < 0 || ref >= arr.length) continue;
      const value = arr[ref];
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.length < 2 || trimmed.length > 60) continue;
      if (SKIP_RE.test(trimmed)) continue;
      fields.set(key, trimmed);
    }
    if (fields.size > 0) registrants.push(fields);
  }
  if (registrants.length === 0) return [];

  // Identify the field that most often holds a full personal name. Random
  // tokens, usernames and shared enum labels never match FULL_NAME_RE, so the
  // real name field wins decisively even when a few players (like single-name
  // "Bohrod") only have a one-word display name.
  const votes = new Map<string, number>();
  for (const fields of registrants) {
    for (const [key, value] of fields) {
      if (FULL_NAME_RE.test(value)) {
        votes.set(key, (votes.get(key) ?? 0) + 1);
      }
    }
  }
  let nameKeyField: string | null = null;
  let bestVotes = 0;
  for (const [key, count] of votes) {
    if (count > bestVotes) {
      bestVotes = count;
      nameKeyField = key;
    }
  }

  const names: string[] = [];
  for (const fields of registrants) {
    // Prefer the detected name field — this is what rescues single-token
    // display names such as "Bohrod" that the old two-token filter dropped.
    let name =
      nameKeyField !== null ? fields.get(nameKeyField) : undefined;
    if (!name || !NAME_VALUE_RE.test(name)) {
      // Fallback for an odd registrant missing the detected field: take a full
      // name from any field, else any plausible name-shaped value.
      const values = [...fields.values()];
      name =
        values.find((v) => FULL_NAME_RE.test(v)) ??
        values.find((v) => NAME_VALUE_RE.test(v));
    }
    if (name) names.push(name);
  }

  return names;
}
