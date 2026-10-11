import { PeopleFilters, PeopleTable } from "@/components/people";
import { PageHeader } from "@/components/ui";
import { listPeople, listTags } from "@/lib/data";
import { queryValue } from "@/lib/format";

export const metadata = { title: "People" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = queryValue(params.status);
  const people = listPeople({
    q: queryValue(params.q),
    role: queryValue(params.role),
    status: status === "all" ? "" : status,
    statuses: status ? [] : ["active"],
    tagId: Number(queryValue(params.tag)) || 0,
    background: queryValue(params.background),
  });
  return (
    <div className="stack" id="content">
      <PageHeader
        title="People"
        lede="Everyone currently helping. Filter by role, interest, or background check before you write to them."
      />
      <PeopleFilters
        action="/admin/people"
        tags={listTags()}
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
