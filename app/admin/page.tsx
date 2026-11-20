import Link from "next/link";
import { CapacityBar, PageHeader, Pill, VolunteerNeed } from "@/components/ui";
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
  const upcoming = (await upcomingEvents(24))
    .slice()
    .sort((a, b) => {
      const aNeeds = a.signed_up < a.minimum_volunteers ? 0 : 1;
      const bNeeds = b.signed_up < b.minimum_volunteers ? 0 : 1;
      if (aNeeds !== bNeeds) return aNeeds - bNeeds;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    })
    .slice(0, 8);
  const needingSoon = upcoming.filter((event) => event.signed_up < event.minimum_volunteers).length;
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
        <section className="need-card card stack">
          <div>
            <p className="eyebrow">Next 7 days</p>
            <h2>Need volunteers</h2>
            <p className="muted">
              {short.length === 1 ? "1 open shift is" : `${short.length} open shifts are`} under the minimum. Open a shift to fill it.
            </p>
          </div>
          <div className="need-list">
            {short.map((event) => {
              const gap = Math.max(0, event.minimum_volunteers - event.signed_up);
              const params = new URLSearchParams();
              if (event.required_background_check) params.set("background", "approved");
              for (const tag of event.tags) params.append("tag", String(tag.id));
              params.set("subject", `${event.title} still needs help`);
              params.set(
                "body",
                `${event.title} (${formatWhen(event.starts_at)}) still needs ${gap === 1 ? "1 more volunteer" : `${gap} more volunteers`}. Sign in to the portal if you can take a shift.`,
              );
              return (
                <VolunteerNeed
                  key={event.id}
                  title={event.title}
                  when={formatWhen(event.starts_at)}
                  filled={event.signed_up}
                  capacity={event.capacity}
                  minimum={event.minimum_volunteers}
                  action={
                    <div className="need-actions">
                      <Link className="btn" href={`/admin/events/${event.id}`}>
                        Fill this shift
                      </Link>
                      <Link className="btn-ghost" href={`/admin/messages/new?${params.toString()}`}>
                        Send announcement
                      </Link>
                    </div>
                  }
                />
              );
            })}
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
          <p className="muted">
            {needingSoon
              ? needingSoon === 1
                ? "1 shift still needs volunteers. It is listed first."
                : `${needingSoon} shifts still need volunteers. Those are listed first.`
              : "Every shift in this list has its minimum."}
          </p>
          <div className="list">
            {upcoming.map((event) => {
              const gap = event.minimum_volunteers - event.signed_up;
              const needs = gap > 0;
              return (
                <Link className={needs ? "row needs" : "row"} key={event.id} href={`/admin/events/${event.id}`}>
                  <div className="row-line">
                    <strong>{event.title}</strong>
                    {needs ? <Pill value="short">Needs {gap} more</Pill> : null}
                  </div>
                  <div className="muted">{formatWhen(event.starts_at)}</div>
                  <CapacityBar filled={event.signed_up} capacity={event.capacity} minimum={event.minimum_volunteers} />
                </Link>
              );
            })}
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
