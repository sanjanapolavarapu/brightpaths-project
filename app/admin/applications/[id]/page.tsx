import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { updateApplicationAction } from "@/lib/actions/applications";
import { getApplication, interestIds, listTags } from "@/lib/data";
import { applicationLabel, cadenceLabel, formatWhen, queryValue, roleLabel, volunteerAsLabel } from "@/lib/format";

export const metadata = { title: "Application" };

const statuses = ["submitted", "interview", "background_check", "approved", "rejected"] as const;

export default async function ApplicationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const application = await getApplication(Number(id));
  if (!application) notFound();
  const query = await searchParams;
  const tags = await listTags();
  const ids = interestIds(application.interests);
  const interestNames = tags.filter((tag) => ids.includes(tag.id)).map((tag) => tag.name);

  return (
    <div className="stack" id="content">
      <PageHeader title={application.name} lede={`${application.email} · ${application.phone}`}>
        <Link className="btn-ghost" href={`/admin/people/${application.user_id}`}>
          Open profile
        </Link>
      </PageHeader>
      <Flash error={queryValue(query.error)} saved={queryValue(query.saved)} />
      <section className="card stack">
        <div className="pills">
          <Pill value={application.role_interest}>{roleLabel(application.role_interest)}</Pill>
          <Pill value={application.volunteer_as}>{volunteerAsLabel(application.volunteer_as)}</Pill>
          <Pill value={application.cadence}>{cadenceLabel(application.cadence)}</Pill>
          <Pill value={application.status}>{applicationLabel(application.status)}</Pill>
        </div>
        <p className="muted">Submitted {formatWhen(application.submitted_at)}</p>
        <h2>Application</h2>
        <p>
          <strong>Comments.</strong> {application.why_join || "None added."}
        </p>
        {application.other_help ? (
          <p>
            <strong>Another way to help.</strong> {application.other_help}
          </p>
        ) : null}
        <p>
          <strong>Experience.</strong> {application.experience || "None added."}
        </p>
        <p>
          <strong>Availability.</strong> {application.availability}
        </p>
        <div className="pills">
          {interestNames.map((name) => (
            <span className="pill" key={name}>
              {name}
            </span>
          ))}
        </div>
      </section>
      <section className="card stack">
        <h2>Status</h2>
        <form className="filters" action={updateApplicationAction}>
          <input type="hidden" name="id" value={application.id} />
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={application.status}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {applicationLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Update status
          </button>
        </form>
      </section>
    </div>
  );
}
