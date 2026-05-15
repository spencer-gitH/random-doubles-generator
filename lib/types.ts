export type Player = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  players: [Player, Player];
};

export type Card = {
  hole: number;
  size: 3 | 4 | 5 | 6;
  teams: Team[];
  cali: Player | null;
};

export type Assignment = {
  cards: Card[];
  generatedAt: string;
};

export type ScrapeResult = {
  slug: string;
  eventName: string;
  players: Player[];
};

export type EventSummary = {
  slug: string;
  seriesName: string;
  weekLabel: string | null;
  type: string | null;
  courseName: string | null;
  cityState: string | null;
  date: string | null;
  imageUrl: string | null;
};
