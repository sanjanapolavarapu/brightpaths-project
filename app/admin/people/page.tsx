import { PeopleFilters, PeopleTable } from "@/components/people";
import { Flash, PageHeader } from "@/components/ui";
import { importVolunteersAction } from "@/lib/actions";
import { listPeople, listTags } from "@/lib/data";
import { queryValue } from "@/lib/format";

function countParam(value: string) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= 300 ? count : 0;
}

export const metadata = { title: "People" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = queryValue(params.status);
  const people = await listPeople({
    q: queryValue(params.q),
    role: queryValue(params.role),
    status: status === "all" ? "" : status,
    statuses: status ? [] : ["active"],
    tagId: Number(queryValue(params.tag)) || 0,
    background: queryValue(params.background),
  });
  return (
    <div className="stack" id="content">
      <PageHeader title="People" />
      <Flash
        error={queryValue(params.error)}
        saved={queryValue(params.saved) === "import" ? undefined : queryValue(params.saved)}
      />
      {queryValue(params.saved) === "import" ? (
        <p className="banner ok">
          Added {countParam(queryValue(params.added))}. Skipped {countParam(queryValue(params.skipped))}.
          {queryValue(params.omitted) === "1" ? " Extra columns were not saved." : ""}
        </p>
      ) : null}
      <section className="card stack">
        <h2>Upload a spreadsheet</h2>
        <p>Excel or CSV. Address, birth date, and ID numbers in the file are skipped.</p>
        <form className="stack" action={importVolunteersAction}>
          <label className="field">
            <span>Spreadsheet</span>
            <input
              name="file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Temporary password</span>
              <input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <p className="muted">At least 8 characters. Use a password they do not use anywhere else.</p>
          <button className="btn" type="submit">
            Upload spreadsheet
          </button>
        </form>
      </section>
      <PeopleFilters
        action="/admin/people"
        tags={await listTags()}
        values={{
          q: queryValue(params.q),
          role: queryValue(params.role),
          status,
          tag: queryValue(params.tag),
          background: queryValue(params.background),
        }}
      />
      <PeopleTable people={people} />
    </div>
  );
}
