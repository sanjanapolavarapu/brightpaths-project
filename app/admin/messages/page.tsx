import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { listMessages } from "@/lib/data";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Announcements" };

export default async function MessagesPage() {
  const messages = await listMessages();
  return (
    <div className="stack" id="content">
      <PageHeader
        title="Announcements"
        lede="Notes for volunteers and interns. Email sends a copy to their inbox and keeps the same note in the portal."
      >
        <Link className="btn" href="/admin/messages/new">
          New announcement
        </Link>
      </PageHeader>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>Announcement</th>
                <th>Audience</th>
                <th>People</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>{formatWhen(message.sent_at)}</td>
                  <td>
                    <Pill kind="channel" value={message.channel}>
                      {message.channel === "email" ? "Email" : "Portal"}
                    </Pill>
                  </td>
                  <td>
                    <Link href={`/admin/messages/${message.id}`}>{message.subject || message.body.slice(0, 80)}</Link>
                  </td>
                  <td>{message.filter_summary}</td>
                  <td>{message.recipient_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
