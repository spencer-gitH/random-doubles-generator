import { eq } from "drizzle-orm";
import type { db } from "./db";
import { playerAliases, players } from "./db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function slugifyPlayerId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function resolvePlayer(
  tx: Tx,
  scrapedName: string,
): Promise<{ id: string; isNew: boolean }> {
  const aliasKey = scrapedName.trim().toLowerCase();

  const aliasHit = await tx
    .select({ playerId: playerAliases.playerId })
    .from(playerAliases)
    .where(eq(playerAliases.alias, aliasKey))
    .limit(1);
  if (aliasHit.length > 0) {
    return { id: aliasHit[0].playerId, isNew: false };
  }

  const canonicalId = slugifyPlayerId(scrapedName);
  if (!canonicalId) {
    throw new Error(`Cannot slugify player name: "${scrapedName}"`);
  }

  const playerHit = await tx
    .select({ id: players.id })
    .from(players)
    .where(eq(players.id, canonicalId))
    .limit(1);

  if (playerHit.length > 0) {
    await tx
      .insert(playerAliases)
      .values({ alias: aliasKey, playerId: canonicalId })
      .onConflictDoNothing();
    return { id: canonicalId, isNew: false };
  }

  await tx.insert(players).values({
    id: canonicalId,
    displayName: scrapedName.trim(),
  });
  await tx
    .insert(playerAliases)
    .values({ alias: aliasKey, playerId: canonicalId })
    .onConflictDoNothing();

  return { id: canonicalId, isNew: true };
}
