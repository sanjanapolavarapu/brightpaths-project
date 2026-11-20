"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "../auth";
import { findRecipients, listTags, notifyUser } from "../data";
import { getDb } from "../db";
import { filtersFrom, idOf, text } from "../form";
import { describeFilters, nowIso } from "../format";
import { mailConfigured, sendAnnouncementEmails } from "../mail";

export async function sendMessageAction(_prev: { error: string }, formData: FormData) {
  const admin = await requireAdmin();
  const channel = text(formData, "channel");
  const subject = text(formData, "subject");
  const body = text(formData, "body");
  const filters = filtersFrom(formData);
  if (channel !== "email" && channel !== "sms") return { error: "Choose email or a portal note." };
  if (!body) return { error: "Write an announcement before sending." };
  if (channel === "email" && !subject) return { error: "Email announcements need a subject." };
  if (channel === "sms" && body.length > 320) return { error: "Keep portal notes to 320 characters." };
  if (body.length > 5000 || subject.length > 140) return { error: "That announcement is too long." };

  const recipients = await findRecipients(filters);
  if (!recipients.length) return { error: "No one matches those filters." };
  const summary = describeFilters(filters, await listTags());
  const db = await getDb();
  const messageId = Number(
    (
      await db
        .prepare(
          `INSERT INTO messages (channel, subject, body, filter_summary, sent_by, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
        )
        .run(channel, channel === "email" ? subject : "", body, summary, admin.id, nowIso())
    ).lastInsertRowid,
  );
  const insert = await db.prepare("INSERT INTO message_recipients (message_id, user_id) VALUES ($1, $2)");
  for (const person of recipients) {
    await insert.run(messageId, person.id);
    await notifyUser(
      person.id,
      "message",
      channel === "email" ? subject : "New announcement",
      "A new announcement is in your portal.",
      "/portal/messages",
    );
  }

  if (channel !== "email") redirect(`/admin/messages/${messageId}?saved=text`);

  const configured = mailConfigured();
  const deliveries = configured
    ? await sendAnnouncementEmails(recipients, { subject, body })
    : recipients.map((person) => ({
        ...person,
        status: "skipped" as const,
        error: "Email is not set up on this site.",
      }));
  const mark = await db.prepare(
    "UPDATE message_recipients SET email_status = $1, email_error = $2 WHERE message_id = $3 AND user_id = $4",
  );
  for (const delivery of deliveries) {
    await mark.run(delivery.status, delivery.error, messageId, delivery.id);
  }

  const sent = deliveries.filter((delivery) => delivery.status === "sent").length;
  const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
  const saved = !configured ? "portalonly" : failed ? "partial" : sent ? "emailed" : "practice";
  redirect(`/admin/messages/${messageId}?saved=${saved}`);
}

export async function markAlertReadAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idOf(formData.get("id"));
  if (text(formData, "all") === "1") {
    await (await getDb()).prepare("UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND read_at IS NULL").run(nowIso(), admin.id);
  } else if (id) {
    await (await getDb())
      .prepare("UPDATE notifications SET read_at = $1 WHERE id = $2 AND user_id = $3")
      .run(nowIso(), id, admin.id);
  }
  redirect("/admin/alerts?saved=read");
}

export async function markPortalMessagesReadAction() {
  const user = await requireUser();
  await (await getDb())
    .prepare("UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND kind = 'message' AND read_at IS NULL")
    .run(nowIso(), user.id);
}
