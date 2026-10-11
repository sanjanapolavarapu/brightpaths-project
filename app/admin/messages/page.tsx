import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { listMessages } from "@/lib/data";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Messages" };

export default function MessagesPage() {
  const messages = listMessages();
  return (
    <div className="stack" id="content">
      <PageHeader title="Messages" lede="Write to a group. It lands in their portal, not in an outside email or text service.">
        <Link className="btn" href="/admin/messages/new">
          New message
        </Link>
      </PageHeader>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>Message</th>
                <th>Audience</th>
                <th>People</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>{formatWhen(message.sent_at)}</td>
                  <td>
                    <Pill value={message.channel === "email" ? "submitted" : "interview"}>
                      {message.channel === "email" ? "Email" : "Text"}
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
