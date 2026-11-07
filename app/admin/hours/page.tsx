import Link from "next/link";
import { HoursTable, HoursToolbar, PageHeader } from "@/components/ui";
import { hoursByPerson, listHours, listPeople } from "@/lib/data";
import { dateRange, formatHours, queryValue, roleLabel } from "@/lib/format";

export const metadata = { title: "Hours" };

export default async function AdminHoursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = dateRange({
    range: queryValue(params.range),
    from: queryValue(params.from),
    to: queryValue(params.to),
  });
  const personId = Number(queryValue(params.person)) || 0;
  const totals = await hoursByPerson({ from: range.from, to: range.to, userId: personId || undefined });
  const rows = await listHours({ from: range.from, to: range.to, userId: personId || undefined });
  const people = await listPeople({ q: "", role: "", status: "", statuses: [], tagId: 0, background: "" });

  return (
    <div className="stack" id="content">
      <PageHeader title="Hours" lede={range.label} />
      <HoursToolbar
        path="/admin/hours"
        rangeKey={range.key}
        from={range.from}
        to={range.to}
        personId={personId ? String(personId) : ""}
        people={people.map((person) => ({ id: person.id, name: person.name }))}
      />
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link href={`/admin/people/${person.id}`}>{person.name}</Link>
                  </td>
                  <td>{roleLabel(person.role)}</td>
                  <td>{formatHours(Number(person.hours))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!totals.length ? <p className="muted">No hours in this range.</p> : null}
      </section>
      <section className="card">
        <h2>Each entry</h2>
        <HoursTable rows={rows} />
      </section>
    </div>
  );
}
