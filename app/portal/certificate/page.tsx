import { PrintButton } from "@/components/print-button";
import { Wordmark } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { listHours } from "@/lib/data";
import { dateRange, formatDay, formatHours, queryValue, roleLabel } from "@/lib/format";

export const metadata = { title: "Hours verification" };

export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const range = dateRange({
    range: queryValue(params.range) || "all",
    from: queryValue(params.from),
    to: queryValue(params.to),
  });
  const rows = await listHours({ userId: user.id, from: range.from, to: range.to });
  const total = rows.reduce((sum, row) => sum + Number(row.hours), 0);
  const period = range.from || range.to ? `${range.from ? formatDay(range.from) : "Start"} – ${range.to ? formatDay(range.to) : "today"}` : "All recorded hours";

  return (
    <article className="sheet stack" id="content">
      <div className="page-head">
        <Wordmark href="/portal" />
        <PrintButton label="Print certificate" />
      </div>
      <p className="eyebrow">Hours verification</p>
      <h1>{user.name}</h1>
      <p>
        {roleLabel(user.role)} · {user.email}
      </p>
      <p>{period}</p>
      <p className="hours-total">{formatHours(total)} hours</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDay(row.served_on)}</td>
              <td>{row.event_title || row.note || "Recorded hours"}</td>
              <td>{formatHours(Number(row.hours))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p>No hours in this stretch yet.</p> : null}
      <div className="sign-row">
        <div>
          <span />
          Staff signature
        </div>
        <div>
          <span />
          Date
        </div>
      </div>
    </article>
  );
}
