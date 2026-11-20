import { notFound } from "next/navigation";
import { CapacityBar, Flash, PageHeader, Pill, TagPill, volunteerGap } from "@/components/ui";
import { cancelSignupAction, signupAction } from "@/lib/actions/events";
import { requireUser } from "@/lib/auth";
import { getEvent, getSignup, qualificationIssues, tagIdsForUser } from "@/lib/data";
import { formatWhen, queryValue, signupLabel } from "@/lib/format";

export const metadata = { title: "Event" };

export default async function PortalEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = await getEvent(Number(id));
  if (!event) notFound();
  const query = await searchParams;
  const signup = await getSignup(event.id, user.id);
  const issues = qualificationIssues(user, event, await tagIdsForUser(user.id));
  const started = new Date(event.starts_at).getTime() < Date.now();
  const onRoster = signup && signup.status !== "cancelled";

  return (
    <div className="stack" id="content">
      <PageHeader title={event.title} lede={`${formatWhen(event.starts_at)} – ${formatWhen(event.ends_at)}`}>
        {onRoster && signup ? <Pill value={signup.status}>{signupLabel(signup.status)}</Pill> : null}
      </PageHeader>
      <Flash error={queryValue(query.error)} saved={queryValue(query.saved)} />
      {event.status === "open" && !started && event.signed_up < event.minimum_volunteers ? (
        <section className="need-card card stack">
          <h2>This shift needs volunteers</h2>
          <p className="need-gap">{volunteerGap(event.signed_up, event.minimum_volunteers)}</p>
        </section>
      ) : null}
      <section className="card stack">
        <p className="copy">{event.description}</p>
        <p>{event.location}</p>
        <div className="pills">
          {event.tags.map((tag) => (
            <TagPill name={tag.name} key={tag.id} />
          ))}
          {event.required_background_check ? <Pill value="pending">Background check required</Pill> : null}
        </div>
        <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
        <p className="muted">{event.hours_credit} hours after staff mark you attended.</p>
        {issues.map((issue) => (
          <p className="banner warn" key={issue}>
            {issue}
          </p>
        ))}
        {event.status === "open" && !started && !issues.length && (!onRoster || (signup?.status === "waitlist" && event.signed_up < event.capacity)) ? (
          <form action={signupAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <button className="btn" type="submit">
              {signup?.status === "waitlist" && event.signed_up < event.capacity
                ? "I'll take the open spot"
                : event.signed_up >= event.capacity
                  ? "Join the waitlist"
                  : "Count me in"}
            </button>
          </form>
        ) : null}
        {onRoster && (signup?.status === "signed_up" || signup?.status === "waitlist") && !started ? (
          <form action={cancelSignupAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <button className="btn-danger" type="submit">
              I can't make it
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
