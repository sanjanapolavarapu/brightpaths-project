import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm, RecordHoursForm } from "@/components/forms";
import { CapacityBar, Flash, PageHeader, Pill, TagPill, volunteerGap } from "@/components/ui";
import { cancelSignupAction, markAttendanceAction } from "@/lib/actions/events";
import { getEvent, listPeople, listSignups, listTags, qualificationIssues, tagIdsForUsers } from "@/lib/data";
import { backgroundLabel, eventStatusLabel, formatWhen, isoToEasternLocal, queryValue, roleLabel, signupLabel } from "@/lib/format";

export const metadata = { title: "Event" };

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const event = await getEvent(Number(id));
  if (!event) notFound();
  const query = await searchParams;
  const roster = await listSignups(event.id);
  const tagMap = await tagIdsForUsers(roster.map((person) => person.user_id));
  const people = await listPeople({ q: "", role: "", status: "", statuses: ["active"], tagId: 0, background: "" });
  const short = event.status === "open" && new Date(event.starts_at).getTime() > Date.now() && event.signed_up < event.minimum_volunteers;

  return (
    <div className="stack" id="content">
      <PageHeader title={event.title} lede={`${formatWhen(event.starts_at)} – ${formatWhen(event.ends_at)} · ${event.location}`}>
        <Pill value={event.status}>{eventStatusLabel(event.status)}</Pill>
      </PageHeader>
      <Flash error={queryValue(query.error)} saved={queryValue(query.saved)} />
      {short ? (
        <section className="need-card card stack">
          <h2>Need volunteers</h2>
          <p className="need-gap">{volunteerGap(event.signed_up, event.minimum_volunteers)}</p>
          <p className="muted">
            {event.signed_up} signed up. Room for {event.capacity}.
          </p>
        </section>
      ) : null}
      <section className="card stack">
        <p className="copy">{event.description}</p>
        <div className="pills">
          {event.tags.map((tag) => (
            <TagPill name={tag.name} key={tag.id} />
          ))}
          {event.required_background_check ? <Pill value="pending">Background check required</Pill> : null}
        </div>
        <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
        <p className="muted">{event.hours_credit} hours credited when someone is marked attended.</p>
      </section>
      <section className="card stack">
        <h2>Roster</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Status</th>
                <th>Qualifications</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((person) => {
                const issues = qualificationIssues(person, event, tagMap.get(person.user_id) ?? []);
                return (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/admin/people/${person.user_id}`}>{person.name}</Link>
                      <div className="muted">
                        {roleLabel(person.role)} · {backgroundLabel(person.background_check)}
                      </div>
                    </td>
                    <td>
                      <Pill value={person.status}>{signupLabel(person.status)}</Pill>
                    </td>
                    <td>{issues.length ? issues.join(" ") : "Meets the requirements."}</td>
                    <td>
                      <div className="filters">
                        {person.status === "signed_up" || person.status === "waitlist" ? (
                          <>
                            <form action={markAttendanceAction}>
                              <input type="hidden" name="signupId" value={person.id} />
                              <input type="hidden" name="status" value="attended" />
                              <button className="btn" type="submit">
                                Mark attended
                              </button>
                            </form>
                            <form action={markAttendanceAction}>
                              <input type="hidden" name="signupId" value={person.id} />
                              <input type="hidden" name="status" value="no_show" />
                              <button className="btn-ghost" type="submit">
                                No show
                              </button>
                            </form>
                          </>
                        ) : null}
                        <form action={cancelSignupAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="userId" value={person.user_id} />
                          <input type="hidden" name="asStaff" value="1" />
                          <button className="btn-danger" type="submit">
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!roster.length ? <p className="muted">No one is signed up.</p> : null}
        <h3>Record hours</h3>
        <RecordHoursForm
          people={people}
          eventId={event.id}
          returnTo={`/admin/events/${event.id}`}
          servedOn={isoToEasternLocal(event.starts_at).slice(0, 10)}
          hours={event.hours_credit}
        />
      </section>
      <details className="card">
        <summary>Edit event</summary>
        <div style={{ marginTop: "1rem" }}>
          <EventForm
            tags={await listTags()}
            event={{
              id: event.id,
              title: event.title,
              description: event.description,
              location: event.location,
              starts: isoToEasternLocal(event.starts_at),
              ends: isoToEasternLocal(event.ends_at),
              capacity: event.capacity,
              minimum_volunteers: event.minimum_volunteers,
              hours_credit: event.hours_credit,
              required_background_check: event.required_background_check,
              status: event.status,
              tagIds: event.tags.map((tag) => tag.id),
            }}
          />
        </div>
      </details>
    </div>
  );
}
