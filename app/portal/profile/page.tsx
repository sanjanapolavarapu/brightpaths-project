import { Flash, PageHeader, Pill } from "@/components/ui";
import { updateOwnProfileAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getPerson, tagIdsForUser } from "@/lib/data";
import { backgroundLabel, queryValue, roleLabel, statusLabel, tagList } from "@/lib/format";
import { listTags } from "@/lib/data";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const person = getPerson(user.id);
  const tags = listTags().filter((tag) => tagIdsForUser(user.id).includes(tag.id));
  return (
    <div className="stack" id="content">
      <PageHeader
        title="Your profile"
        lede="Update your phone and when you're free. Staff look after your tags, role, and background-check status."
      />
      <Flash error={queryValue(params.error)} saved={queryValue(params.saved)} />
      <section className="card stack">
        <div className="pills">
          <Pill value={user.role}>{roleLabel(user.role)}</Pill>
          <Pill value={user.account_status}>{statusLabel(user.account_status)}</Pill>
          <Pill value={user.background_check}>{backgroundLabel(user.background_check)}</Pill>
        </div>
        <div className="pills">
          {tagList(person?.tag_names).map((tag) => (
            <span className="pill" key={tag}>
              {tag}
            </span>
          ))}
          {!tags.length ? <span className="muted">No interests listed yet. Staff can add those.</span> : null}
        </div>
      </section>
      <section className="card stack">
        <h2>How we reach you</h2>
        <form className="stack" action={updateOwnProfileAction}>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" defaultValue={user.phone} required />
          </label>
          <label className="field">
            <span>Availability</span>
            <input name="availability" defaultValue={user.availability} placeholder="Weekday mornings, Saturday afternoons, or weekends" />
            <p className="muted">Name the days and time of day. Suggested shifts use this.</p>
          </label>
          <h3>Change password</h3>
          <label className="field">
            <span>Current password</span>
            <input name="currentPassword" type="password" autoComplete="current-password" />
          </label>
          <label className="field">
            <span>New password</span>
            <input name="nextPassword" type="password" autoComplete="new-password" />
          </label>
          <button className="btn" type="submit">
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
