import { MessageComposer } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { findRecipients, listTags } from "@/lib/data";
import { describeFilters, queryValue } from "@/lib/format";
import type { RecipientFilters } from "@/lib/types";

export const metadata = { title: "New message" };

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tags = await listTags();
  const role = queryValue(params.role);
  const tagValues = params.tag;
  const tagIds = (Array.isArray(tagValues) ? tagValues : tagValues ? [tagValues] : [])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const filters: RecipientFilters = {
    role: role === "volunteer" || role === "intern" ? role : "",
    backgroundApproved: queryValue(params.background) === "approved",
    includeArchived: queryValue(params.archived) === "1",
    tagIds,
  };
  const recipients = await findRecipients(filters);

  return (
    <div className="stack" id="content">
      <PageHeader title="New message" />
      <section className="card stack">
        <h2>Who should get it</h2>
        <form className="stack" action="/admin/messages/new" method="get">
          <div className="form-grid">
            <label className="field">
              <span>Role</span>
              <select name="role" defaultValue={filters.role}>
                <option value="">Volunteers and interns</option>
                <option value="volunteer">Volunteers</option>
                <option value="intern">Interns</option>
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="background" value="approved" defaultChecked={filters.backgroundApproved} />
            Approved background check only
          </label>
          <label className="check">
            <input type="checkbox" name="archived" value="1" defaultChecked={filters.includeArchived} />
            Include inactive and alumni
          </label>
          <fieldset>
            <legend>Must have all selected tags</legend>
            <div className="checks">
              {tags.map((tag) => (
                <label className="check" key={tag.id}>
                  <input type="checkbox" name="tag" value={tag.id} defaultChecked={filters.tagIds.includes(tag.id)} /> {tag.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn-ghost" type="submit">
            Show matching people
          </button>
        </form>
        <p>
          <strong>{recipients.length}</strong> match. {describeFilters(filters, tags)}
        </p>
        <ul>
          {recipients.map((person) => (
            <li key={person.id}>
              {person.name} · {person.email} · {person.phone}
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <MessageComposer
          recipientCount={recipients.length}
          filters={{
            role: filters.role,
            background: filters.backgroundApproved,
            archived: filters.includeArchived,
            tagIds: filters.tagIds,
          }}
        />
      </section>
    </div>
  );
}
