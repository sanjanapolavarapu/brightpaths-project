import Link from "next/link";
import { CapacityBar, PageHeader } from "@/components/ui";
import {
  applicationCounts,
  dashboardStats,
  listApplications,
  listNotifications,
  refreshUnderstaffedAlerts,
  upcomingEvents,
} from "@/lib/data";
import { applicationLabel, formatHours, formatWhen } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function AdminHome() {
  const admin = await requireAdmin();
  const stats = await dashboardStats();
  const short = await refreshUnderstaffedAlerts();
  const counts = await applicationCounts();
  const applications = (await listApplications(["submitted", "interview", "background_check"])).slice(0, 5);
  const upcoming = await upcomingEvents();
  const alerts = (await listNotifications(admin.id)).filter((alert) => !alert.read_at).slice(0, 4);

  return (
    <div className="stack" id="content">
      <PageHeader title={`Hello, ${admin.name.split(" ")[0]}`} />
      <section className="stats">
        <article className="stat">
          <span>Active volunteers</span>
          <b>{stats.volunteers}</b>
        </article>
        <article className="stat">
          <span>Active interns</span>
          <b>{stats.interns}</b>
        </article>
        <article className="stat">
          <span>Applications in progress</span>
          <b>{stats.applications}</b>
        </article>
        <article className="stat">
          <span>Hours this month</span>
          <b>{formatHours(stats.hoursThisMonth)}</b>
        </article>
      </section>
      {short.length ? (
        <section className="banner warn">
          <strong>Short on volunteers in the next 7 days.</strong>
          <div className="list">
            {short.map((event) => (
              <Link className="row" key={event.id} href={`/admin/events/${event.id}`}>
                {event.title}: {event.signed_up} signed up, {event.minimum_volunteers} needed
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="banner ok">No open shifts in the next 7 days are under the minimum.</p>
      )}
      <div className="two split">
        <section className="card">
          <h2>Applications to review</h2>
          <p className="muted">
            {counts.submitted} submitted · {counts.interview} interview · {counts.background_check} background check
          </p>
          <div className="list">
            {applications.map((application) => (
              <Link className="row" key={application.id} href={`/admin/applications/${application.id}`}>
                <strong>{application.name}</strong>
                <div className="muted">
                  {application.role_interest === "intern" ? "Intern" : "Volunteer"} · {applicationLabel(application.status)}
                </div>
              </Link>
            ))}
            {!applications.length ? <p>No applications are waiting.</p> : null}
          </div>
          <p className="card-foot">
            <Link href="/admin/applications">All applications</Link>
          </p>
        </section>
        <section className="card">
          <h2>Upcoming events</h2>
          <div className="list">
            {upcoming.map((event) => (
              <Link className="row" key={event.id} href={`/admin/events/${event.id}`}>
                <strong>{event.title}</strong>
                <div className="muted">{formatWhen(event.starts_at)}</div>
                <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
              </Link>
            ))}
            {!upcoming.length ? <p>No open events on the calendar.</p> : null}
          </div>
        </section>
      </div>
      <section className="card">
        <h2>Unread alerts</h2>
        <div className="list">
          {alerts.map((alert) => (
            <Link className="row" key={alert.id} href={alert.href || "/admin/alerts"}>
              <strong>{alert.title}</strong>
              <div className="muted">{alert.body}</div>
            </Link>
          ))}
          {!alerts.length ? <p>No unread alerts.</p> : null}
        </div>
      </section>
    </div>
  );
}
