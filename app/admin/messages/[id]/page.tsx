import { notFound } from "next/navigation";
import { Flash, PageHeader, Pill } from "@/components/ui";
import { getMessage, messageRecipients } from "@/lib/data";
import { formatWhen, queryValue, roleLabel } from "@/lib/format";

export const metadata = { title: "Message" };

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
  return (
    <div className="stack" id="content">
      <PageHeader title={message.subject || "Message"} lede={`${formatWhen(message.sent_at)} · ${message.sender_name}`}>
        <Pill value={message.channel === "email" ? "submitted" : "interview"}>{message.channel === "email" ? "Email" : "Text"}</Pill>
      </PageHeader>
      <Flash saved={queryValue(query.saved)} />
      <section className="card stack">
        <p>{message.body}</p>
        <p className="muted">{message.filter_summary}</p>
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
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{roleLabel(person.role)}</td>
                  <td>{person.email}</td>
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
