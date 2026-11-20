import { notFound } from "next/navigation";
import { MailboxSend } from "@/components/mailbox-send";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { getMessage, messageRecipients } from "@/lib/data";
import { emailDeliveryLabel, formatWhen, queryValue, roleLabel } from "@/lib/format";
import { announcementSender, mailConfigured } from "@/lib/mail";

export const metadata = { title: "Announcement" };

export default async function MessageDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const message = await getMessage(Number(id));
  if (!message) notFound();
  const query = await searchParams;
  const recipients = await messageRecipients(message.id);
  const emailed = recipients.filter((person) => person.email_status === "sent").length;
  const unsent = recipients.length - emailed;
  return (
    <div className="stack" id="content">
      <PageHeader title={message.subject || "Announcement"} lede={`${formatWhen(message.sent_at)} · ${message.sender_name}`}>
        <Pill kind="channel" value={message.channel}>{message.channel === "email" ? "Email" : "Portal"}</Pill>
      </PageHeader>
      <Flash saved={queryValue(query.saved)} />
      {message.channel === "email" && emailed === 0 && !mailConfigured() ? (
        <MailboxSend
          fromEmail={announcementSender()}
          subject={message.subject || "Announcement"}
          body={message.body}
          emails={recipients.map((person) => person.email)}
        />
      ) : null}
      <section className="card stack">
        <p className="copy">{message.body}</p>
        <p className="muted">{message.filter_summary}</p>
        {message.channel === "email" && (emailed > 0 || mailConfigured()) ? (
          <p className="muted">
            {emailed} emailed. {unsent} not sent.
          </p>
        ) : message.channel === "sms" ? (
          <p className="muted">This note is in the portal only.</p>
        ) : null}
      </section>
      <section className="card">
        <h2>Recipients</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                {message.channel === "email" ? <th>Delivery</th> : null}
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{roleLabel(person.role)}</td>
                  <td>{person.email}</td>
                  {message.channel === "email" ? (
                    <td>
                      <Pill
                        value={
                          person.email_status === "sent"
                            ? "approved"
                            : person.email_status === "failed"
                              ? "rejected"
                              : person.email_status === "skipped"
                                ? "pending"
                                : "inactive"
                        }
                      >
                        {emailDeliveryLabel(person.email_status)}
                      </Pill>
                      {person.email_error ? <div className="muted">{person.email_error}</div> : null}
                    </td>
                  ) : null}
                  <td>{person.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
