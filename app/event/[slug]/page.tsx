import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import RosterEditor from "@/components/RosterEditor";
import {
  EmptyRosterError,
  EventNotFoundError,
  fetchParticipants,
  ScrapeError,
} from "@/lib/scrape";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

type Params = { slug: string };

export default async function EventPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  let data;
  let errorMessage: string | null = null;

  try {
    data = await fetchParticipants(slug);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      errorMessage = `No UDisc event found for "${slug}". Double-check the URL.`;
    } else if (err instanceof EmptyRosterError) {
      errorMessage = "UDisc loaded the event but no participants are listed yet.";
    } else if (err instanceof ScrapeError) {
      errorMessage = `Couldn't read UDisc: ${err.message}`;
    } else {
      errorMessage = `Unexpected error: ${(err as Error).message}`;
    }
  }

  if (errorMessage || !data) {
    return (
      <main className="screen state-center">
        <Eyebrow rule hot>
          [ ROSTER UNAVAILABLE ]
        </Eyebrow>
        <h1 className="state-title">Couldn&apos;t load roster</h1>
        <p className="state-body">{errorMessage}</p>
        <Link href="/" className="back-btn">
          ← Today
        </Link>
      </main>
    );
  }

  return (
    <main className="screen screen--roster">
      <header className="rs-header">
        <Link href="/" className="back-btn">
          ← Today
        </Link>
        <div className="rs-title-wrap">
          <Eyebrow rule={false}>[ TODAY · UDISC ]</Eyebrow>
          <h1 className="rs-title">{data.eventName}</h1>
          <div className="rs-course">
            ▸ {data.players.length} player
            {data.players.length === 1 ? "" : "s"} from UDisc
          </div>
        </div>
      </header>

      <RosterEditor slug={slug} initialPlayers={data.players} />
    </main>
  );
}
