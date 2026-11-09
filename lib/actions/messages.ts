"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "../auth";
import { findRecipients, listTags, notifyUser } from "../data";
import { getDb } from "../db";
import { filtersFrom, idOf, text } from "../form";
import { describeFilters, nowIso } from "../format";

export async function sendMessageAction(_prev: { error: string }, formData: FormData) {
  const admin = await requireAdmin();
  const channel = text(formData, "channel");
  const subject = text(formData, "subject");
  const body = text(formData, "body");
  const filters = filtersFrom(formData);
  if (channel !== "email" && channel !== "sms") return { error: "Choose email or text." };
  if (!body) return { error: "Write a message before sending." };
  if (channel === "email" && !subject) return { error: "Email messages need a subject." };
  if (channel === "sms" && body.length > 320) return { error: "Keep text messages to 320 characters." };
  if (body.length > 5000 || subject.length > 140) return { error: "That message is too long." };

  const recipients = await findRecipients(filters);
  if (!recipients.length) return { error: "No one matches those filters." };
  // Saved in the portal inbox only. Nothing is sent by email or text.
  const summary = describeFilters(filters, await listTags());
  const messageId = Number(
    (
    await (await getDb())
      .prepare(
        `INSERT INTO messages (channel, subject, body, filter_summary, sent_by, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
      )
      .run(channel, channel === "email" ? subject : "", body, summary, admin.id, nowIso())
    ).lastInsertRowid,
  );
  const insert = await (await getDb()).prepare("INSERT INTO message_recipients (message_id, user_id) VALUES ($1, $2)");
  for (const person of recipients) {
    await insert.run(messageId, person.id);
    await notifyUser(
      person.id,
      "message",
      channel === "email" ? subject : "New text from staff",
      channel === "email" ? "You have a new email in your portal inbox." : body.slice(0, 140),
      "/portal/messages",
    );
  }
  redirect(`/admin/messages/${messageId}?saved=message`);
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
