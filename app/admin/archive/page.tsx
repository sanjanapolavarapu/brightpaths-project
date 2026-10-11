import { PeopleFilters, PeopleTable } from "@/components/people";
import { PageHeader } from "@/components/ui";
import { listPeople, listTags } from "@/lib/data";
import { queryValue } from "@/lib/format";

export const metadata = { title: "Archive" };

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const people = listPeople({
    q: queryValue(params.q),
    role: queryValue(params.role),
    status: "",
    statuses: ["inactive", "alumni"],
    tagId: Number(queryValue(params.tag)) || 0,
    background: queryValue(params.background),
  });
  return (
    <div className="stack" id="content">
      <PageHeader
        title="Archive"
        lede="People who have stepped back. Their hours, interests, and private notes stay here for thank-yous and reference letters."
      />
      <PeopleFilters
        action="/admin/archive"
        tags={listTags()}
        showStatus={false}
        values={{
          q: queryValue(params.q),
          role: queryValue(params.role),
          tag: queryValue(params.tag),
          background: queryValue(params.background),
        }}
      />
      <PeopleTable people={people} />
    </div>
  );
}
