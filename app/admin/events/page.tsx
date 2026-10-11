import Link from "next/link";
import { MonthCalendar } from "@/components/calendar";
import { CapacityBar, PageHeader, Pill } from "@/components/ui";
import { listEvents } from "@/lib/data";
import { currentEasternMonth, eventStatusLabel, formatWhen, queryValue } from "@/lib/format";

export const metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const monthParam = queryValue(params.month);
  const fallback = currentEasternMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
  const year = match ? Number(match[1]) : fallback.year;
  const month = match ? Number(match[2]) : fallback.month;
  const events = listEvents();
  const upcoming = events.filter((event) => event.status === "open" && new Date(event.starts_at).getTime() >= Date.now());

  return (
    <div className="stack" id="content">
      <PageHeader title="Events" lede="Shifts people can join. See who's coming, and which days still need a few more.">
        <Link className="btn" href="/admin/events/new">
          New event
        </Link>
      </PageHeader>
      <section className="card">
        <MonthCalendar
          year={year}
          month={month}
          path="/admin/events"
          events={events.map((event) => ({
            id: event.id,
            title: event.title,
            starts_at: event.starts_at,
            short: event.status === "open" && event.signed_up < event.minimum_volunteers,
          }))}
        />
      </section>
      <section className="card">
        <h2>Open shifts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Status</th>
                <th>Fill</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link href={`/admin/events/${event.id}`}>{event.title}</Link>
                    <div className="pills">
                      {event.tags.map((tag) => (
                        <span className="pill" key={tag.id}>
                          {tag.name}
                        </span>
                      ))}
                      {event.required_background_check ? <Pill value="pending">Background check</Pill> : null}
                    </div>
                  </td>
                  <td>{formatWhen(event.starts_at)}</td>
                  <td>
                    <Pill value={event.status}>{eventStatusLabel(event.status)}</Pill>
                  </td>
                  <td>
                    <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
