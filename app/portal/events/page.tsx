import Link from "next/link";
import { MonthCalendar } from "@/components/calendar";
import { CapacityBar, PageHeader } from "@/components/ui";
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
  const tagIds = tagIdsForUser(user.id);
  const events = listEvents().filter((event) => event.status === "open" || event.status === "completed");
  const upcoming = events.filter((event) => event.status === "open" && new Date(event.starts_at).getTime() >= Date.now());
  const suggested = suggestedEventsFor(user, tagIds);

  return (
    <div className="stack" id="content">
      <PageHeader
        title="Find a shift"
        lede="Suggested shifts fit your interests and availability. You can join when the tags and background check match."
      />
      <section className="card">
        <MonthCalendar
          year={year}
          month={month}
          path="/portal/events"
          events={events.map((event) => ({
            id: event.id,
            title: event.title,
            starts_at: event.starts_at,
            short: false,
          }))}
        />
      </section>
      {suggested.length ? (
        <section className="card stack">
          <h2>Suggested for you</h2>
          <p className="muted">
            {user.availability
              ? `These fit “${user.availability}” and your interests.`
              : "These fit your interests."}
          </p>
          {suggested.map((event) => (
            <Link key={event.id} href={`/portal/events/${event.id}`}>
              <strong>{event.title}</strong>
              <div className="muted">{formatWhen(event.starts_at)} · {event.location}</div>
            </Link>
          ))}
        </section>
      ) : user.account_status === "active" ? (
        <p className="banner info">No open shifts match your interests and availability right now. The full list is below.</p>
      ) : null}
      <section className="card">
        <h2>Open right now</h2>
        <div className="list">
          {upcoming.map((event) => {
            const issues = qualificationIssues(user, event, tagIds);
            return (
              <Link className="row" key={event.id} href={`/portal/events/${event.id}`}>
                <strong>{event.title}</strong>
                <div className="muted">{formatWhen(event.starts_at)} · {event.location}</div>
                <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
                <div className="muted">{issues.length ? issues[0] : "You're a fit for this one."}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
