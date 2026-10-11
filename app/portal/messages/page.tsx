import { PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { markKindRead, messagesFor } from "@/lib/data";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function PortalMessagesPage() {
  const user = await requireUser();
  markKindRead(user.id, "message");
  const messages = messagesFor(user.id);
  return (
    <div className="stack" id="content">
      <PageHeader
        title="Notes for you"
        lede="Messages from the Brightpaths team land here. They stay in the portal and are not sent to your phone or email."
      />
      {messages.map((message) => (
        <article className="card stack" key={message.id}>
          <div className="page-head">
            <h2>{message.subject || "A note from staff"}</h2>
            <Pill value={message.channel === "email" ? "submitted" : "interview"}>{message.channel === "email" ? "Email" : "Text"}</Pill>
          </div>
          <p className="muted">
            {message.sender_name} · {formatWhen(message.sent_at)}
          </p>
          <p>{message.body}</p>
          <p className="muted">Sent to: {message.filter_summary}</p>
        </article>
      ))}
      {!messages.length ? <p className="muted">Nothing here yet. When staff write to you, it will show up in this spot.</p> : null}
    </div>
  );
}
