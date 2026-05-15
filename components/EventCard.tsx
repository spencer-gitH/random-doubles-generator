import Link from "next/link";
import type { EventSummary } from "@/lib/types";

export default function EventCard({ event }: { event: EventSummary }) {
  const title = event.weekLabel
    ? `${event.seriesName} — ${event.weekLabel}`
    : event.seriesName;
  const location = [event.courseName, event.cityState].filter(Boolean).join(" • ");

  return (
    <Link
      href={`/event/${event.slug}`}
      className="block rounded-lg border border-gray-200 p-4 hover:border-gray-400 active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {event.type && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {event.type}
          </span>
        )}
      </div>
      {location && (
        <p className="mt-1 text-sm text-gray-600">{location}</p>
      )}
    </Link>
  );
}
