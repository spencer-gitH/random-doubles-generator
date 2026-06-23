/**
 * Regression tests for participant scraping.
 *
 * Run with `npm test` (uses tsx, no test framework needed). Exits non-zero on
 * the first failed assertion.
 *
 * The headline case: a player whose UDisc display name is a single word
 * ("Bohrod" — the league knows him as "Bo") must survive the client-rendered
 * streaming-data path. He used to be silently dropped because the old extractor
 * only accepted names with two or more capitalized tokens.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseParticipants } from "../lib/scrape";
import { nameKey } from "../lib/nameKey";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(join(here, "fixtures", name), "utf8");

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- Client-rendered (streaming-data) path: the Bo regression ----------------
{
  console.log("client-rendered streaming path:");
  const { players } = parseParticipants(
    fixture("participants-client-rendered.html"),
    "test-slug",
  );
  const names = players.map((p) => p.name);

  check("17 players parsed", players.length === 17, `got ${players.length}`);
  check(
    'single-name "Bohrod" is present',
    names.some((n) => nameKey(n) === "bohrod"),
    `names: ${names.join(", ")}`,
  );
  check(
    "full names still parsed",
    names.includes("Phil Pingeton") && names.includes("Spencer Nightingale"),
  );
  check(
    "no junk tokens leaked in",
    names.every((n) => /^\p{Lu}/u.test(n) && !/_/.test(n)),
    `names: ${names.join(", ")}`,
  );
  check(
    "ids are unique",
    new Set(players.map((p) => p.id)).size === players.length,
  );
}

// --- Server-rendered path + dedup -------------------------------------------
{
  console.log("server-rendered path + dedup:");
  const { players } = parseParticipants(
    fixture("participants-server-rendered.html"),
    "test-slug",
  );
  const names = players.map((p) => p.name);

  // "Bohrod" + "  bohrod  " collapse to one; "Mauricio  Orellana" +
  // "MAURICIO ORELLANA" collapse to one → 3 distinct players.
  check("dedups case/whitespace variants", players.length === 3, `got ${players.length}: ${names.join(", ")}`);
  check(
    'single-name "Bohrod" kept on server-rendered path too',
    names.some((n) => nameKey(n) === "bohrod"),
  );
  check(
    "internal whitespace collapsed",
    names.includes("Mauricio Orellana"),
    `names: ${names.join(", ")}`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nAll scrape regression checks passed.");
