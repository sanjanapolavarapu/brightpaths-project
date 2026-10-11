import Link from "next/link";
import { Flash, PageHeader } from "@/components/ui";
import { markAlertReadAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { listNotifications } from "@/lib/data";
import { formatWhen, queryValue } from "@/lib/format";

export const metadata = { title: "Alerts" };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const alerts = listNotifications(admin.id);
  return (
    <div className="stack" id="content">
      <PageHeader title="Alerts" lede="New applications, and shifts that are still short on people in the next 7 days.">
        <form action={markAlertReadAction}>
          <input type="hidden" name="all" value="1" />
          <button className="btn-ghost" type="submit">
            Mark all read
          </button>
        </form>
      </PageHeader>
      <Flash saved={queryValue(params.saved)} />
      {alerts.map((alert) => (
        <article className="card stack" key={alert.id}>
          <div className="page-head">
            <div>
              <h2>{alert.title}</h2>
              <p className="muted">{formatWhen(alert.created_at)}{alert.read_at ? " · Read" : " · Unread"}</p>
            </div>
            {!alert.read_at ? (
              <form action={markAlertReadAction}>
                <input type="hidden" name="id" value={alert.id} />
                <button className="text-btn" type="submit">
                  Mark read
                </button>
              </form>
            ) : null}
          </div>
          <p>{alert.body}</p>
          {alert.href ? <Link href={alert.href}>Open</Link> : null}
        </article>
      ))}
      {!alerts.length ? <p className="muted">No alerts yet.</p> : null}
    </div>
  );
}
