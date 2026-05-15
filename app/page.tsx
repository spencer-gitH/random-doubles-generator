import EventCard from "@/components/EventCard";
import PasteUrlFallback from "@/components/PasteUrlFallback";
import { fetchTodaysEvents, EventsScrapeError } from "@/lib/searchEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const revalidate = 60;

export default async function HomePage() {
  let events;
  let errorMessage: string | null = null;

  try {
    events = await fetchTodaysEvents(100);
  } catch (err) {
    if (err instanceof EventsScrapeError) {
      errorMessage = err.message;
    } else {
      errorMessage = (err as Error).message;
    }
  }

  const today = new Date();
  const todayLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasEvents = events && events.length > 0;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Random Doubles</h1>
        <p className="text-sm text-gray-500 mt-1">Events today — {todayLabel}</p>
      </header>

      {hasEvents && (
        <ul className="flex flex-col gap-2">
          {events!.map((e) => (
            <li key={e.slug}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}

      {!hasEvents && !errorMessage && (
        <PasteUrlFallback
          variant="primary"
          message="No UDisc events today within 100 miles. Paste a URL instead:"
        />
      )}

      {errorMessage && (
        <PasteUrlFallback
          variant="primary"
          message={`Couldn't load events from UDisc (${errorMessage}). Paste a URL instead:`}
        />
      )}

      {hasEvents && <PasteUrlFallback variant="footer" />}
    </main>
  );
}
