import Link from "next/link";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getApplicationForUser, hoursByPerson, participationFor, shortEventsFor, suggestedEventsFor, tagIdsForUser } from "@/lib/data";
import { applicationLabel, dateRange, formatHours, formatWhen, queryValue } from "@/lib/format";

export const metadata = { title: "Your home" };

const steps = ["submitted", "interview", "background_check", "approved"] as const;

export default async function PortalHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const range = dateRange({ range: "month" });
  const monthHours = await hoursByPerson({ from: range.from, to: range.to, userId: user.id });
  const total = monthHours[0]?.hours ?? 0;
  const application = await getApplicationForUser(user.id);
  const upcoming = (await participationFor(user.id)).filter(
    (item) => item.status === "signed_up" && new Date(item.starts_at).getTime() >= Date.now(),
  );
  const tagIds = await tagIdsForUser(user.id);
  const short = user.account_status === "active" ? await shortEventsFor(user, tagIds) : [];
  const suggested = await suggestedEventsFor(user, tagIds);
  const first = user.name.split(" ")[0];

  return (
    <div className="stack" id="content">
      <PageHeader title={`Hello, ${first}`} />
      <Flash saved={queryValue(params.saved)} />
      {application && user.account_status === "applicant" ? (
        <section className="card stack">
          <h2>Application</h2>
          <div className="timeline">
            {steps.map((step, index) => (
              <span className={index <= steps.indexOf(application.status as (typeof steps)[number]) ? "on" : ""} key={step}>
                {applicationLabel(step)}
              </span>
            ))}
            {application.status === "rejected" ? <span className="on">Not accepted</span> : null}
          </div>
          <p>
            Current step: <Pill value={application.status}>{applicationLabel(application.status)}</Pill>
          </p>
          <p className="muted">Sign-up opens after approval.</p>
        </section>
      ) : null}
      {user.account_status === "alumni" || user.account_status === "inactive" ? (
        <p className="banner info">This profile is archived. Hours are still here.</p>
      ) : null}
      <section className="stats">
        <article className="stat">
          <span>Hours this month</span>
          <b>{formatHours(Number(total))}</b>
        </article>
        <article className="stat">
          <span>Upcoming shifts</span>
          <b>{upcoming.length}</b>
        </article>
      </section>
      <section className="card stack">
        <h2>On your calendar</h2>
        {upcoming.map((item) => (
          <Link key={item.id} href={`/portal/events/${item.event_id}`}>
            <strong>{item.title}</strong>
            <div className="muted">{formatWhen(item.starts_at)}</div>
          </Link>
        ))}
        {!upcoming.length ? <p className="muted">No upcoming shifts.</p> : null}
        <Link href="/portal/hours">Look up your hours</Link>
      </section>
      {suggested.length ? (
        <section className="card stack">
          <h2>Suggested shifts</h2>
          {suggested.map((event) => (
            <Link key={event.id} href={`/portal/events/${event.id}`}>
              {event.title} · {formatWhen(event.starts_at)}
            </Link>
          ))}
        </section>
      ) : null}
      {short.length ? (
        <section className="card stack">
          <h2>Short this week</h2>
          {short.map((event) => (
            <Link key={event.id} href={`/portal/events/${event.id}`}>
              {event.title} · {formatWhen(event.starts_at)} · {event.signed_up} of {event.minimum_volunteers} needed
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
