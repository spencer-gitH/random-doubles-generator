import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { playerAliases, players, seasons } from "../lib/db/schema";

async function main() {
  console.log("Seeding 2026 season + known aliases…");

  await db
    .insert(seasons)
    .values({
      id: "2026",
      leagueSlug: "gallaudet-wednesday-doubles-n344pG",
      name: "2026 Season",
      startDate: "2026-03-11",
      endDate: null,
    })
    .onConflictDoNothing();

  await db
    .insert(players)
    .values([
      { id: "ryan-bohrod", displayName: 'Ryan "Bo" Bohrod' },
      { id: "kevin-dardick", displayName: "Kevin Dardick" },
    ])
    .onConflictDoNothing();

  await db
    .insert(playerAliases)
    .values([
      { alias: "bohrod", playerId: "ryan-bohrod" },
      { alias: "ryan bohrod", playerId: "ryan-bohrod" },
      { alias: 'ryan "bo" bohrod', playerId: "ryan-bohrod" },
      { alias: "kev", playerId: "kevin-dardick" },
      { alias: "kevin dardick", playerId: "kevin-dardick" },
    ])
    .onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
