import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Wordmark } from "@/components/brand";
import { getPerson, listHours, listNotes, participationFor } from "@/lib/data";
import { backgroundLabel, formatDay, formatHours, formatWhen, roleLabel, signupLabel, statusLabel, tagList } from "@/lib/format";

export const metadata = { title: "Involvement summary" };

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(Number(id));
  if (!person) notFound();
  const hours = await listHours({ userId: person.id });
  const notes = await listNotes(person.id);
  const history = await participationFor(person.id);
  const total = hours.reduce((sum, entry) => sum + Number(entry.hours), 0);

  return (
    <article className="sheet stack" id="content">
      <div className="page-head">
        <Wordmark href="/admin" />
        <PrintButton label="Print summary" />
      </div>
      <p className="eyebrow">Staff reference</p>
      <h1>{person.name}</h1>
      <p>
        {roleLabel(person.role)} · {statusLabel(person.account_status)} · Background check{" "}
        {backgroundLabel(person.background_check).toLowerCase()}
      </p>
      <p>
        {person.email} · {person.phone}
      </p>
      <p>{tagList(person.tag_names).join(", ") || "No tags"}</p>
      <p className="hours-total">{formatHours(total)} recorded hours</p>
      <h2>Hours</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>What</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDay(entry.served_on)}</td>
              <td>{entry.event_title || entry.note}</td>
              <td>{formatHours(Number(entry.hours))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Events</h2>
      <ul>
        {history.map((item) => (
          <li key={item.id}>
            {item.title} · {formatWhen(item.starts_at)} · {signupLabel(item.status)}
          </li>
        ))}
      </ul>
      <h2>Private notes</h2>
      {notes.map((note) => (
        <p key={note.id}>
          {note.body} <span className="muted">({note.author_name}, {formatWhen(note.created_at)})</span>
        </p>
      ))}
    </article>
  );
}
