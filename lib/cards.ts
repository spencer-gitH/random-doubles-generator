export type CardSize = 3 | 4 | 5 | 6;

export function computeCardSizes(playerCount: number): CardSize[] {
  if (playerCount < 3) {
    throw new Error("Need at least 3 players to form a card.");
  }

  const mod = playerCount % 4;
  const fourCount = Math.floor(playerCount / 4);

  switch (mod) {
    case 0:
      return Array<CardSize>(fourCount).fill(4);
    case 1:
      return [5, ...Array<CardSize>(fourCount - 1).fill(4)];
    case 2:
      return [6, ...Array<CardSize>(fourCount - 1).fill(4)];
    case 3:
      return [...Array<CardSize>(fourCount).fill(4), 3];
    default:
      throw new Error(`Unreachable: mod=${mod}`);
  }
}

export const MAX_HOLES = 9;

export function exceedsHoleLimit(cardCount: number): boolean {
  return cardCount > MAX_HOLES;
}
