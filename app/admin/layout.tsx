import { AdminShell } from "@/components/shells";
import { requireAdmin } from "@/lib/auth";
import { refreshUnderstaffedAlerts, unreadCount } from "@/lib/data";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  refreshUnderstaffedAlerts();
  return (
    <AdminShell user={user} unread={unreadCount(user.id)}>
      {children}
    </AdminShell>
  );
}
