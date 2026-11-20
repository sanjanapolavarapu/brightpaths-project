import Link from "next/link";
import { MonthCalendar } from "@/components/calendar";
import { CapacityBar, PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listEvents, qualificationIssues, suggestedEventsFor, tagIdsForUser } from "@/lib/data";
import { currentEasternMonth, formatWhen, queryValue } from "@/lib/format";

export const metadata = { title: "Events" };

export default async function PortalEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const monthParam = queryValue(params.month);
  const fallback = currentEasternMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
  const year = match ? Number(match[1]) : fallback.year;
  const month = match ? Number(match[2]) : fallback.month;
  const tagIds = await tagIdsForUser(user.id);
  const events = (await listEvents()).filter((event) => event.status === "open" || event.status === "completed");
  const upcoming = events
    .filter((event) => event.status === "open" && new Date(event.starts_at).getTime() >= Date.now())
    .sort((a, b) => {
      const aNeeds = a.signed_up < a.minimum_volunteers ? 0 : 1;
      const bNeeds = b.signed_up < b.minimum_volunteers ? 0 : 1;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  const suggested = await suggestedEventsFor(user, tagIds);

  return (
    <div className="stack" id="content">
      <PageHeader title="Shifts" />
      <section className="card">
        <MonthCalendar
          year={year}
          month={month}
          path="/portal/events"
          events={events.map((event) => ({
            id: event.id,
            title: event.title,
            starts_at: event.starts_at,
            short: event.status === "open" && event.signed_up < event.minimum_volunteers,
          }))}
        />
      </section>
      {suggested.length ? (
        <section className="card stack">
          <h2>Suggested</h2>
          {suggested.map((event) => (
            <Link key={event.id} href={`/portal/events/${event.id}`}>
              <strong>{event.title}</strong>
              <div className="muted">{formatWhen(event.starts_at)} · {event.location}</div>
            </Link>
          ))}
        </section>
      ) : user.account_status === "active" ? (
        <p className="banner info">No suggested shifts right now.</p>
      ) : null}
      <section className="card">
        <h2>Open</h2>
        <p className="muted">Shifts that still need volunteers are highlighted and listed first.</p>
        <div className="list">
          {upcoming.map((event) => {
            const issues = qualificationIssues(user, event, tagIds);
            const gap = event.minimum_volunteers - event.signed_up;
            const needs = gap > 0;
            return (
              <Link className={needs ? "row needs" : "row"} key={event.id} href={`/portal/events/${event.id}`}>
                <div className="row-line">
                  <strong>{event.title}</strong>
                  {needs ? <Pill value="short">Needs {gap} more</Pill> : null}
                </div>
                <div className="muted">{formatWhen(event.starts_at)} · {event.location}</div>
                <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
                {issues.length ? <div className="muted">{issues[0]}</div> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
