import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/forms";
import { CapacityBar, Flash, PageHeader, Pill } from "@/components/ui";
import { cancelSignupAction, logHoursAction, markAttendanceAction } from "@/lib/actions/events";
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
        <p className="banner warn">
          This shift has {event.signed_up} of {event.minimum_volunteers} volunteers needed.
        </p>
      ) : null}
      <section className="card stack">
        <p>{event.description}</p>
        <div className="pills">
          {event.tags.map((tag) => (
            <span className="pill" key={tag.id}>
              {tag.name}
            </span>
          ))}
          {event.required_background_check ? <Pill value="approved">Background check required</Pill> : null}
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
        <form className="filters" action={logHoursAction}>
          <input type="hidden" name="returnTo" value={`/admin/events/${event.id}`} />
          <input type="hidden" name="eventId" value={event.id} />
          <label className="field">
            <span>Person</span>
            <select name="userId" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" name="servedOn" required defaultValue={isoToEasternLocal(event.starts_at).slice(0, 10)} />
          </label>
          <label className="field">
            <span>Hours</span>
            <input type="number" name="hours" min={0.25} step={0.25} required defaultValue={event.hours_credit} />
          </label>
          <button className="btn" type="submit">
            Record hours
          </button>
        </form>
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
