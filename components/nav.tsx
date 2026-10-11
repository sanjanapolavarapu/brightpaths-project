"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./brand";

const adminLinks = [
  ["/admin", "Dashboard"],
  ["/admin/applications", "Applications"],
  ["/admin/people", "People"],
  ["/admin/archive", "Archive"],
  ["/admin/events", "Events"],
  ["/admin/hours", "Hours"],
  ["/admin/messages", "Messages"],
  ["/admin/alerts", "Alerts"],
];

const portalLinks = [
  ["/portal", "Home"],
  ["/portal/events", "Events"],
  ["/portal/hours", "Hours"],
  ["/portal/messages", "Messages"],
  ["/portal/profile", "Profile"],
];

function Item({ href, label, badge, exact }: { href: string; label: string; badge?: number; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link className={active ? "active" : ""} href={href}>
      {label}
      {badge ? <span className="badge">{badge}</span> : null}
    </Link>
  );
}

export function AdminNav({ unread }: { unread: number }) {
  return (
    <aside className="sidebar no-print">
      <Wordmark href="/admin" onDark />
      <nav className="side-links" aria-label="Staff">
        {adminLinks.map(([href, label]) => (
          <Item key={href} href={href} label={label} exact={href === "/admin"} badge={href === "/admin/alerts" ? unread : 0} />
        ))}
      </nav>
    </aside>
  );
}

export function PortalNav({ unread }: { unread: number }) {
  return (
    <aside className="sidebar no-print">
      <Wordmark href="/portal" onDark />
      <nav className="side-links" aria-label="Your portal">
        {portalLinks.map(([href, label]) => (
          <Item
            key={href}
            href={href}
            label={label}
            exact={href === "/portal"}
            badge={href === "/portal/messages" ? unread : 0}
          />
        ))}
      </nav>
    </aside>
  );
}
