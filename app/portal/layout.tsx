import { PortalShell } from "@/components/shells";
import { requireUser } from "@/lib/auth";
import { unreadCount } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  return (
    <PortalShell user={user} unread={await unreadCount(user.id, "message")}>
      {children}
    </PortalShell>
  );
}
