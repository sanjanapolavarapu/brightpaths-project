import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { applicationCounts, listApplications } from "@/lib/data";
import { applicationLabel, formatWhen, queryValue, roleLabel } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";

export const metadata = { title: "Applications" };

const views: { key: string; label: string; statuses?: ApplicationStatus[] }[] = [
  { key: "progress", label: "In progress", statuses: ["submitted", "interview", "background_check"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "rejected", label: "Not accepted", statuses: ["rejected"] },
  { key: "all", label: "All" },
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = queryValue(params.view) || "progress";
  const current = views.find((item) => item.key === view) ?? views[0];
  const applications = await listApplications(current.statuses);
  const counts = await applicationCounts();
  const inProgress = counts.submitted + counts.interview + counts.background_check;

  return (
    <div id="content">
      <PageHeader title="Applications" />
      <nav className="tabs">
        {views.map((item) => (
          <Link key={item.key} className={item.key === current.key ? "current" : ""} href={`/admin/applications?view=${item.key}`}>
            {item.label}
            {item.key === "progress" ? ` (${inProgress})` : ""}
          </Link>
        ))}
      </nav>
      {current.key === "progress" ? (
        <div className="pipeline">
          {(["submitted", "interview", "background_check"] as ApplicationStatus[]).map((status) => (
            <section className="card" key={status}>
              <h2>{applicationLabel(status)}</h2>
              <div className="list">
                {applications
                  .filter((application) => application.status === status)
                  .map((application) => (
                    <Link className="row" key={application.id} href={`/admin/applications/${application.id}`}>
                      <strong>{application.name}</strong>
                      <div className="muted">
                        {roleLabel(application.role_interest)} · {formatWhen(application.submitted_at)}
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <Link href={`/admin/applications/${application.id}`}>{application.name}</Link>
                  </td>
                  <td>{roleLabel(application.role_interest)}</td>
                  <td>
                    <Pill value={application.status}>{applicationLabel(application.status)}</Pill>
                  </td>
                  <td>{formatWhen(application.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!applications.length ? <p className="muted">Nothing in this list.</p> : null}
        </div>
      )}
    </div>
  );
}
