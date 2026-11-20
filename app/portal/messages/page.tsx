import { PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { markKindRead, messagesFor } from "@/lib/data";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Announcements" };

export default async function PortalMessagesPage() {
  const user = await requireUser();
  await markKindRead(user.id, "message");
  const messages = await messagesFor(user.id);
  return (
    <div className="stack" id="content">
      <PageHeader title="Announcements" lede="Notes from staff. Email announcements also arrive in your inbox." />
      {messages.map((message) => (
        <article className="card stack" key={message.id}>
          <div className="page-head">
            <h2>{message.subject || "Announcement"}</h2>
            <Pill kind="channel" value={message.channel}>{message.channel === "email" ? "Email" : "Portal"}</Pill>
          </div>
          <p className="muted">
            {message.sender_name} · {formatWhen(message.sent_at)}
          </p>
          <p className="copy">{message.body}</p>
          {message.channel === "email" && message.email_status === "sent" ? (
            <p className="muted">A copy was sent to your email.</p>
          ) : null}
          <p className="muted">Sent to: {message.filter_summary}</p>
        </article>
      ))}
      {!messages.length ? <p className="muted">No announcements yet.</p> : null}
    </div>
  );
}
