import Link from "next/link";
import { easternDateKey, monthLabel, monthMatrix, shiftMonth } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({
  year,
  month,
  path,
  events,
}: {
  year: number;
  month: number;
  path: string;
  events: { id: number; title: string; starts_at: string; short: boolean }[];
}) {
  const cells = monthMatrix(year, month);
  const today = easternDateKey(new Date().toISOString());
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const byDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = easternDateKey(event.starts_at);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  return (
    <div>
      <div className="cal-nav">
        <Link className="btn-ghost" href={`${path}?month=${prev.year}-${String(prev.month).padStart(2, "0")}`}>
          Previous
        </Link>
        <h2>{monthLabel(year, month)}</h2>
        <Link className="btn-ghost" href={`${path}?month=${next.year}-${String(next.month).padStart(2, "0")}`}>
          Next
        </Link>
      </div>
      <div className="calendar">
        {WEEKDAYS.map((day) => (
          <div className="dow" key={day}>
            {day}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div className={`day${cell.date ? "" : " empty"}${cell.date === today ? " today" : ""}`} key={cell.date ?? `empty-${index}`}>
            {cell.day ? <strong>{cell.day}</strong> : null}
            {cell.date
              ? (byDay.get(cell.date) ?? []).map((event) => (
                  <Link key={event.id} className={event.short ? "short" : ""} href={`${path}/${event.id}`} title={event.title}>
                    {event.title}
                  </Link>
                ))
              : null}
          </div>
        ))}
      </div>
    </div>
  );
}
