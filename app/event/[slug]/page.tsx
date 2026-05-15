import Link from "next/link";
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col gap-4 text-center">
          <h1 className="text-xl font-semibold">Couldn&apos;t load roster</h1>
          <p className="text-sm text-red-600">{errorMessage}</p>
          <Link href="/" className="text-sm underline">
            Back to start
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
      <header className="mb-4">
        <Link href="/" className="text-xs text-gray-500 underline">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{data.eventName}</h1>
        <p className="text-xs text-gray-500 mt-1">
          {data.players.length} player{data.players.length === 1 ? "" : "s"} from UDisc
        </p>
      </header>
      <RosterEditor slug={slug} initialPlayers={data.players} />
    </main>
  );
}
