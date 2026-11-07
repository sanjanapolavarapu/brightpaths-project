import { PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { markKindRead, messagesFor } from "@/lib/data";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function PortalMessagesPage() {
  const user = await requireUser();
  await markKindRead(user.id, "message");
  const messages = await messagesFor(user.id);
  return (
    <div className="stack" id="content">
      <PageHeader title="Messages" />
      {messages.map((message) => (
        <article className="card stack" key={message.id}>
          <div className="page-head">
            <h2>{message.subject || "Message"}</h2>
            <Pill value={message.channel === "email" ? "submitted" : "interview"}>{message.channel === "email" ? "Email" : "Text"}</Pill>
          </div>
          <p className="muted">
            {message.sender_name} · {formatWhen(message.sent_at)}
          </p>
          <p>{message.body}</p>
          <p className="muted">Sent to: {message.filter_summary}</p>
        </article>
      ))}
      {!messages.length ? <p className="muted">No messages.</p> : null}
    </div>
  );
}
