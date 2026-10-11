import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { addNoteAction, logHoursAction, savePersonAction } from "@/lib/actions";
import { getApplicationForUser, getPerson, listEvents, listHours, listNotes, listTags, participationFor, tagIdsForUser } from "@/lib/data";
import {
  backgroundLabel,
  formatDay,
  formatHours,
  formatWhen,
  queryValue,
  roleLabel,
  signupLabel,
  statusLabel,
} from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const person = getPerson(Number(id));
  if (!person) notFound();
  const query = await searchParams;
  const tags = listTags();
  const selected = new Set(tagIdsForUser(person.id));
  const notes = listNotes(person.id);
  const hours = listHours({ userId: person.id });
  const history = participationFor(person.id);
  const application = getApplicationForUser(person.id);
  const events = listEvents();

  return (
    <div className="stack" id="content">
      <PageHeader title={person.name} lede={`${person.email} · ${person.phone || "No phone"}`}>
        <Link className="btn-ghost" href={`/admin/people/${person.id}/summary`}>
          Print involvement summary
        </Link>
      </PageHeader>
      <Flash error={queryValue(query.error)} saved={queryValue(query.saved)} />
      <section className="card stack">
        <h2>Qualifications and status</h2>
        <p className="muted">
          Interns and volunteers can switch roles here. Background check is a status for scheduling. Do not put document
          numbers in notes.
        </p>
        {application ? (
          <p>
            <Link href={`/admin/applications/${application.id}`}>View application</Link>
          </p>
        ) : null}
        <form className="stack" action={savePersonAction}>
          <input type="hidden" name="id" value={person.id} />
          <div className="form-grid">
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue={person.role}>
                <option value="volunteer">Volunteer</option>
                <option value="intern">Intern</option>
              </select>
            </label>
            <label className="field">
              <span>Account</span>
              <select name="account_status" defaultValue={person.account_status}>
                <option value="applicant">Applicant</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="alumni">Alumni</option>
              </select>
            </label>
            <label className="field">
              <span>Background check</span>
              <select name="background_check" defaultValue={person.background_check}>
                <option value="not_started">Not started</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" defaultValue={person.phone} />
            </label>
          </div>
          <label className="field">
            <span>Availability</span>
            <input name="availability" defaultValue={person.availability} placeholder="Weekday mornings, Saturday afternoons, or weekends" />
            <p className="muted">Suggested shifts use days and times named here, plus profile tags.</p>
          </label>
          <fieldset>
            <legend>Tags</legend>
            <div className="checks">
              {tags.map((tag) => (
                <label className="check" key={tag.id}>
                  <input type="checkbox" name="tag" value={tag.id} defaultChecked={selected.has(tag.id)} /> {tag.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn" type="submit">
            Save profile
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Private notes</h2>
        <p className="muted">Only staff can see notes. Use them for impact, interests, and reference letters.</p>
        {notes.map((note) => (
          <article className="note" key={note.id}>
            <p>{note.body}</p>
            <time>
              {note.author_name} · {formatWhen(note.created_at)}
            </time>
          </article>
        ))}
        {!notes.length ? <p className="muted">No notes yet.</p> : null}
        <form className="stack" action={addNoteAction}>
          <input type="hidden" name="id" value={person.id} />
          <label className="field">
            <span>Add a note</span>
            <textarea name="body" required />
          </label>
          <button className="btn-ghost" type="submit">
            Save note
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Hours</h2>
        <p className="hours-total">{formatHours(Number(person.hours_total))}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDay(entry.served_on)}</td>
                  <td>{entry.event_title || entry.note || "Recorded hours"}</td>
                  <td>{formatHours(Number(entry.hours))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="filters" action={logHoursAction}>
          <input type="hidden" name="userId" value={person.id} />
          <input type="hidden" name="returnTo" value={`/admin/people/${person.id}`} />
          <label className="field">
            <span>Date</span>
            <input type="date" name="servedOn" required />
          </label>
          <label className="field">
            <span>Hours</span>
            <input type="number" name="hours" min={0.25} step={0.25} required />
          </label>
          <label className="field">
            <span>Event</span>
            <select name="eventId" defaultValue="">
              <option value="">Not tied to an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>Note</span>
            <input name="note" />
          </label>
          <button className="btn" type="submit">
            Record hours
          </button>
        </form>
      </section>
      <section className="card stack">
        <h2>Participation history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/admin/events/${item.event_id}`}>{item.title}</Link>
                  </td>
                  <td>{formatWhen(item.starts_at)}</td>
                  <td>
                    <Pill value={item.status}>{signupLabel(item.status)}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!history.length ? <p className="muted">No events yet.</p> : null}
        <p className="muted">
          Current labels: {roleLabel(person.role)}, {statusLabel(person.account_status)}, background check{" "}
          {backgroundLabel(person.background_check).toLowerCase()}.
        </p>
      </section>
    </div>
  );
}
