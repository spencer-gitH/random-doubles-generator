import Link from "next/link";
import EventCard from "@/components/EventCard";
import PasteUrlFallback from "@/components/PasteUrlFallback";
import Wordmark from "@/components/Wordmark";
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
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);
  const wkday = today
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const dateLabel = `${dd}.${mm}.${yy}`;

  const hasEvents = events && events.length > 0;
  const eventCount = hasEvents ? events!.length : 0;

  return (
    <main className="screen screen--home">
      <header className="home-header">
        <Wordmark diceSize={36} />
        <div className="home-header__meta">
          <div className="home-header__meta-row">
            <span className="home-header__meta-label">DAY/</span>
            <span>{wkday}</span>
          </div>
          <div className="home-header__meta-row">
            <span className="home-header__meta-label">DATE/</span>
            <span>{dateLabel}</span>
          </div>
          <Link href="/standings" className="home-header__standings-link">
            STANDINGS →
          </Link>
        </div>
      </header>

      <div className="home-hero">
        <div className="home-hero__pre">[ ON THE DOCKET ▸ TODAY ]</div>
        <h1 className="home-hero__title">
          Pick a card.
          <br />
          <span className="home-hero__title-em">Roll the dice.</span>
        </h1>
        <p className="home-hero__sub">
          UDisc events within a 100-mile radius. Tap one to load its roster.
        </p>
      </div>

      <div className="home-events__count">
        <div className="home-events__count-num">
          {String(eventCount).padStart(2, "0")}
        </div>
        <div className="home-events__count-label">
          <span>Events / Live</span>
          <em>
            {wkday} {dateLabel} · 100mi radius
          </em>
        </div>
      </div>

      {hasEvents && (
        <ul className="event-list">
          {events!.map((e, i) => (
            <li key={e.slug}>
              <EventCard event={e} index={i + 1} />
            </li>
          ))}
        </ul>
      )}

      {!hasEvents && !errorMessage && (
        <section className="home-fallback">
          <PasteUrlFallback
            variant="primary"
            message="No UDisc events today within 100 miles. Paste a URL instead."
          />
        </section>
      )}

      {errorMessage && (
        <section className="home-fallback">
          <PasteUrlFallback
            variant="primary"
            message={`Couldn't load events from UDisc (${errorMessage}). Paste a URL instead.`}
          />
        </section>
      )}

      {hasEvents && (
        <section className="home-fallback">
          <PasteUrlFallback variant="footer" />
        </section>
      )}

      <footer className="home-footer">
        <div className="home-footer__rule" />
        <div className="home-footer__text">
          <span>v0.4 · CLUBHOUSE</span>
          <span>UDISC ↔ LIVE</span>
        </div>
      </footer>
    </main>
  );
}
