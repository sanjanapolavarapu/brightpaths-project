import type { User } from "@/lib/types";
import { AdminNav, PortalNav } from "./nav";
import { SignOutButton } from "./sign-out";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function AdminShell({
  user,
  unread,
  children,
}: {
  user: User;
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <AdminNav unread={unread} />
      <div className="main-col">
        <div className="topbar no-print">
          <p className="topbar-kicker">{todayLabel()}</p>
          <div className="who">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
            <span>{user.name}</span>
            <SignOutButton />
          </div>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

export function PortalShell({
  user,
  unread,
  children,
}: {
  user: User;
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <PortalNav unread={unread} />
      <div className="main-col">
        <div className="topbar no-print">
          <p className="topbar-kicker">
            {todayLabel()}
            {user.account_status === "applicant"
              ? " · application in review"
              : user.account_status === "alumni" || user.account_status === "inactive"
                ? " · archived"
                : ""}
          </p>
          <div className="who">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
            <span>{user.name}</span>
            <SignOutButton />
          </div>
        </div>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
