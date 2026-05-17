import Link from "next/link";
import type { EventSummary } from "@/lib/types";

export default function EventCard({
  event,
  index,
}: {
  event: EventSummary;
  index: number;
}) {
  const title = event.weekLabel
    ? `${event.seriesName} / ${event.weekLabel}`
    : event.seriesName;

  return (
    <Link href={`/event/${event.slug}`} className="event-card">
      <div className="event-card__num">{String(index).padStart(2, "0")}</div>
      <div className="event-card__body">
        <div className="event-card__series">{title}</div>
        {event.courseName && (
          <div className="event-card__course">{event.courseName}</div>
        )}
        {event.cityState && (
          <div className="event-card__loc">{event.cityState}</div>
        )}
      </div>
      {event.type && (
        <div className="event-card__type">{event.type}</div>
      )}
    </Link>
  );
}
