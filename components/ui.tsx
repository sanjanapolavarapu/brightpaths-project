import Link from "next/link";
import { formatDay, formatHours } from "@/lib/format";

const ERRORS: Record<string, string> = {
  credentials: "We couldn't match that email and password. Try again.",
  missing: "A few required fields are still empty.",
  password: "Use a password of at least 8 characters.",
  closed: "This shift isn't open for sign-up right now.",
  qualify: "This shift isn't a match for your profile yet.",
  already: "You're already on this one.",
  past: "That shift has already started.",
  hours: "Enter a valid date and a number of hours greater than 0.",
  person: "Choose a person.",
};

const SAVED: Record<string, string> = {
  application: "Updated. They can see the new status when they sign in.",
  note: "Note saved. Only staff can see it.",
  profile: "Saved.",
  event: "Shift saved.",
  hours: "Hours recorded. Thank you.",
  signup: "You're in. See you there.",
  waitlist: "That shift is full, so you're on the waitlist. We'll move you up if a spot opens.",
  cancel: "You're off that shift. Thanks for letting us know.",
  attendance: "Attendance updated.",
  message: "Delivered to their inboxes in this portal. It was not sent through an outside email or phone service.",
  read: "Alerts updated.",
  contact: "Saved. Thanks for keeping your info current.",
  password: "Your password is updated.",
  applied: "We got your application. Staff will take a look.",
};

export function Flash({ error, saved }: { error?: string; saved?: string }) {
  if (error && ERRORS[error]) return <p className="banner bad">{ERRORS[error]}</p>;
  if (saved && SAVED[saved]) return <p className="banner ok">{SAVED[saved]}</p>;
  return null;
}

export function PageHeader({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function Pill({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className={`pill ${value}`}>{children}</span>;
}

export function CapacityBar({
  filled,
  capacity,
  minimum,
}: {
  filled: number;
  capacity: number;
  minimum: number;
}) {
  const pct = capacity ? Math.min(100, Math.round((filled / capacity) * 100)) : 0;
  const mark = capacity ? Math.min(100, Math.round((minimum / capacity) * 100)) : 0;
  const short = filled < minimum;
  return (
    <div className="capacity">
      <div className="capacity-track" aria-hidden="true">
        {pct > 0 ? <span className={short ? "fill short" : "fill"} style={{ width: `${pct}%` }} /> : null}
        {mark > 2 && mark < 98 ? <span className="capacity-mark" style={{ left: `${mark}%` }} /> : null}
      </div>
      <span>
        {filled} / {capacity} signed up
        {short ? ` · needs ${minimum}` : ""}
      </span>
    </div>
  );
}

export function HoursToolbar({
  path,
  rangeKey,
  from,
  to,
  personId,
  people,
}: {
  path: string;
  rangeKey: string;
  from: string;
  to: string;
  personId?: string;
  people?: { id: number; name: string }[];
}) {
  const person = personId ? `&person=${personId}` : "";
  return (
    <div className="stack">
      <div className="tabs">
        <Link className={rangeKey === "month" ? "current" : ""} href={`${path}?range=month${person}`}>
          This month
        </Link>
        <Link className={rangeKey === "quarter" ? "current" : ""} href={`${path}?range=quarter${person}`}>
          Last 3 months
        </Link>
        <Link className={rangeKey === "all" ? "current" : ""} href={`${path}?range=all${person}`}>
          All hours
        </Link>
      </div>
      <form className="filters" action={path} method="get">
        <label className="field">
          <span>From</span>
          <input type="date" name="from" defaultValue={from} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" name="to" defaultValue={to} />
        </label>
        {people ? (
          <label className="field">
            <span>Person</span>
            <select name="person" defaultValue={personId ?? ""}>
              <option value="">Everyone</option>
              {people.map((personOption) => (
                <option key={personOption.id} value={personOption.id}>
                  {personOption.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="btn-ghost" type="submit">
          Apply dates
        </button>
      </form>
    </div>
  );
}

export function HoursTable({
  rows,
}: {
  rows: { id: number; served_on: string; hours: number; event_title: string | null; note: string; person_name?: string }[];
}) {
  if (!rows.length) return <p className="muted">No hours in this range.</p>;
  const total = rows.reduce((sum, row) => sum + Number(row.hours), 0);
  return (
    <div className="stack">
      <p className="hours-total">{formatHours(total)} hours</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {rows.some((row) => row.person_name) ? <th>Person</th> : null}
              <th>Event</th>
              <th>Hours</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDay(row.served_on)}</td>
                {rows.some((item) => item.person_name) ? <td>{row.person_name}</td> : null}
                <td>{row.event_title || "Recorded hours"}</td>
                <td>{formatHours(Number(row.hours))}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
