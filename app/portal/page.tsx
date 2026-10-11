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
  const monthHours = hoursByPerson({ from: range.from, to: range.to, userId: user.id });
  const total = monthHours[0]?.hours ?? 0;
  const application = getApplicationForUser(user.id);
  const upcoming = participationFor(user.id).filter(
    (item) => item.status === "signed_up" && new Date(item.starts_at).getTime() >= Date.now(),
  );
  const tagIds = tagIdsForUser(user.id);
  const short = user.account_status === "active" ? shortEventsFor(user, tagIds) : [];
  const suggested = suggestedEventsFor(user, tagIds);
  const first = user.name.split(" ")[0];
  const lede =
    user.account_status === "applicant"
      ? "Your application is moving. Here's the step it's on."
      : user.account_status === "alumni" || user.account_status === "inactive"
        ? "Your hours are saved. Look back anytime, or print a copy."
        : "Shifts, hours, and notes from staff are all in this one spot.";

  return (
    <div className="stack" id="content">
      <PageHeader title={`Hi, ${first}`} lede={lede} />
      <Flash saved={queryValue(params.saved)} />
      {application && user.account_status === "applicant" ? (
        <section className="card stack">
          <h2>Where your application stands</h2>
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
          <p className="muted">You can look through events now. Signing up opens after staff approve you.</p>
        </section>
      ) : null}
      {user.account_status === "alumni" || user.account_status === "inactive" ? (
        <p className="banner info">This profile is archived. Hours are still here to review or print.</p>
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
        {!upcoming.length ? <p className="muted">No upcoming shifts yet. The events page has open ones.</p> : null}
        <Link href="/portal/hours">Look up your hours</Link>
      </section>
      {suggested.length ? (
        <section className="card stack">
          <h2>Suggested for you</h2>
          <p className="muted">These match your interests and the days you said you&apos;re free.</p>
          {suggested.map((event) => (
            <Link key={event.id} href={`/portal/events/${event.id}`}>
              {event.title} · {formatWhen(event.starts_at)}
            </Link>
          ))}
        </section>
      ) : null}
      {short.length ? (
        <section className="card stack">
          <h2>Still looking for people</h2>
          <p className="muted">You qualify for these, and they&apos;re short in the next 7 days.</p>
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
