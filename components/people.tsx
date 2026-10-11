import Link from "next/link";
import { backgroundLabel, formatHours, roleLabel, statusLabel, tagList } from "@/lib/format";
import type { PersonRow, Tag } from "@/lib/types";
import { Pill } from "./ui";

export function PeopleFilters({
  action,
  tags,
  values,
  showStatus = true,
}: {
  action: string;
  tags: Tag[];
  values: { q?: string; role?: string; status?: string; tag?: string; background?: string };
  showStatus?: boolean;
}) {
  return (
    <form className="filters" action={action} method="get">
      <label className="field">
        <span>Search</span>
        <input name="q" defaultValue={values.q} placeholder="Name or email" />
      </label>
      <label className="field">
        <span>Role</span>
        <select name="role" defaultValue={values.role ?? ""}>
          <option value="">All roles</option>
          <option value="volunteer">Volunteers</option>
          <option value="intern">Interns</option>
        </select>
      </label>
      {showStatus ? (
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={values.status ?? ""}>
            <option value="">Active</option>
            <option value="all">Any status</option>
            <option value="applicant">Applicants</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="alumni">Alumni</option>
          </select>
        </label>
      ) : null}
      <label className="field">
        <span>Tag</span>
        <select name="tag" defaultValue={values.tag ?? ""}>
          <option value="">Any tag</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Background check</span>
        <select name="background" defaultValue={values.background ?? ""}>
          <option value="">Any</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="not_started">Not started</option>
          <option value="expired">Expired</option>
        </select>
      </label>
      <button className="btn" type="submit">
        Filter
      </button>
      <Link className="btn-ghost" href={action}>
        Clear
      </Link>
    </form>
  );
}

export function PeopleTable({ people }: { people: PersonRow[] }) {
  if (!people.length) return <p className="muted">No one matches those filters.</p>;
  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Background check</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <Link href={`/admin/people/${person.id}`}>
                  <strong>{person.name}</strong>
                </Link>
                <div className="muted">{person.email}</div>
              </td>
              <td>
                <Pill value={person.role}>{roleLabel(person.role)}</Pill>
              </td>
              <td>
                <Pill value={person.account_status}>{statusLabel(person.account_status)}</Pill>
              </td>
              <td>
                <div className="pills">
                  {tagList(person.tag_names).map((tag) => (
                    <span className="pill" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <Pill value={person.background_check}>{backgroundLabel(person.background_check)}</Pill>
              </td>
              <td>{formatHours(Number(person.hours_total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
