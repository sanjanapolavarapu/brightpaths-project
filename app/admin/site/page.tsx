import Link from "next/link";
import { SiteForm } from "@/components/site-editor";
import { Flash, PageHeader } from "@/components/ui";
import { saveTagAction } from "@/lib/actions";
import { listTags } from "@/lib/data";
import { queryValue } from "@/lib/format";
import { getSite } from "@/lib/site";

export const metadata = { title: "Website" };

export default async function SitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tags = await listTags();
  return (
    <div className="stack" id="content">
      <PageHeader title="Website">
        <Link className="btn-ghost" href="/">
          View homepage
        </Link>
      </PageHeader>
      <Flash error={queryValue(params.error)} saved={queryValue(params.saved)} />
      <section className="card">
        <SiteForm site={await getSite()} />
      </section>
      <section className="card stack">
        <div>
          <h2>Ways to help</h2>
          <p className="muted">Shown on the application form. A background check applies to those shifts.</p>
        </div>
        {tags.map((tag) => (
          <form className="tag-line" key={tag.id} action={saveTagAction}>
            <input type="hidden" name="id" value={tag.id} />
            <label className="field">
              <span>Name</span>
              <input name="name" required maxLength={60} defaultValue={tag.name} />
            </label>
            <label className="check">
              <input type="checkbox" name="background" value="1" defaultChecked={Boolean(tag.requires_background)} />
              Needs a background check
            </label>
            <button className="btn" type="submit">
              Save
            </button>
          </form>
        ))}
        <form className="stack tag-add" action={saveTagAction}>
          <h3>Add a way to help</h3>
          <label className="field">
            <span>Name</span>
            <input name="name" required maxLength={60} placeholder="Meal delivery" />
          </label>
          <label className="check">
            <input type="checkbox" name="background" value="1" />
            Needs a background check before someone can take these shifts
          </label>
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
