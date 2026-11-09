"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "../auth";
import { getEvent, getSignup, getUser, hasHoursForEvent, insertHours, listTags, promoteWaitlist, qualificationIssues, tagIdsForUser } from "../data";
import { getDb } from "../db";
import { adminPath, idOf, tagIdsFrom, text, withParam } from "../form";
import { easternDateKey, easternLocalToIso, isYmd, nowIso } from "../format";
import { attendanceDecision, signupDecision } from "../rules";

export async function saveEventAction(_prev: { error: string }, formData: FormData) {
  const admin = await requireAdmin();
  const id = idOf(formData.get("id"));
  const title = text(formData, "title");
  const description = text(formData, "description");
  const location = text(formData, "location");
  const starts = easternLocalToIso(text(formData, "starts"));
  const ends = easternLocalToIso(text(formData, "ends"));
  const capacity = Number(formData.get("capacity"));
  const minimum = Number(formData.get("minimum"));
  const hours = Number(formData.get("hours"));
  const requestedBackground = formData.get("background") === "1";
  const status = text(formData, "status") || "open";
  const statuses = ["draft", "open", "cancelled", "completed"];
  if (!title || !description || !location || title.length > 140) {
    return { error: "Add a title, description, and location." };
  }
  if (!starts || !ends || ends <= starts) return { error: "The end time has to be after the start." };
  if (!Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(minimum) || minimum < 1 || minimum > capacity) {
    return { error: "Minimum volunteers has to be at least 1 and no higher than capacity." };
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return { error: "Enter the hours this shift is worth." };
  if (!statuses.includes(status)) return { error: "Choose an event status." };

  const catalog = await listTags();
  const selectedTags = tagIdsFrom(formData).filter((tagId) => catalog.some((tag) => tag.id === tagId));
  const taggedBackground = selectedTags.some((tagId) => catalog.some((tag) => tag.id === tagId && tag.requires_background));
  const background = requestedBackground || taggedBackground ? 1 : 0;

  const db = (await getDb());
  let eventId = id;
  if (id && await getEvent(id)) {
    await db.prepare(
      `UPDATE events
       SET title = $1, description = $2, location = $3, starts_at = $4, ends_at = $5, capacity = $6, minimum_volunteers = $7,
           hours_credit = $8, required_background_check = $9, status = $10
       WHERE id = $11`,
    ).run(title, description, location, starts, ends, capacity, minimum, hours, background, status, id);
    await db.prepare("DELETE FROM event_tags WHERE event_id = $1").run(id);
  } else {
    eventId = Number(
      (
        await db.prepare(
          `INSERT INTO events
          (title, description, location, starts_at, ends_at, capacity, minimum_volunteers, hours_credit, required_background_check, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        ).run(
          title,
          description,
          location,
          starts,
          ends,
          capacity,
          minimum,
          hours,
          background,
          status,
          admin.id,
          nowIso(),
        )
      ).lastInsertRowid,
    );
  }
  const insert = await db.prepare("INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2)");
  for (const tagId of selectedTags) await insert.run(eventId, tagId);
  redirect(`/admin/events/${eventId}?saved=event`);
}

export async function signupAction(formData: FormData) {
  const user = await requireUser();
  const eventId = idOf(formData.get("eventId"));
  const event = await getEvent(eventId);
  const issues = event ? qualificationIssues(user, event, await tagIdsForUser(user.id)) : [];
  const existing = event ? await getSignup(eventId, user.id) : undefined;
  // Checked, then written. Two people at the same moment can both take the last spot.
  const decision = signupDecision({
    status: event?.status ?? "",
    startsAt: event ? new Date(event.starts_at).getTime() : 0,
    now: Date.now(),
    blocked: issues.length > 0,
    existingStatus: existing?.status ?? null,
    signedUp: event?.signed_up ?? 0,
    capacity: event?.capacity ?? 0,
  });
  if (!decision.ok) redirect(`/portal/events/${eventId || ""}?error=${decision.error}`);
  const status = decision.status;
  if (existing) {
    await (await getDb()).prepare("UPDATE signups SET status = $1, created_at = $2 WHERE id = $3").run(status, nowIso(), existing.id);
  } else {
    await (await getDb())
      .prepare("INSERT INTO signups (event_id, user_id, status, created_at) VALUES ($1, $2, $3, $4)")
      .run(eventId, user.id, status, nowIso());
  }
  redirect(`/portal/events/${eventId}?saved=${status === "signed_up" ? "signup" : "waitlist"}`);
}

export async function cancelSignupAction(formData: FormData) {
  const user = await requireUser();
  const eventId = idOf(formData.get("eventId"));
  const asStaff = text(formData, "asStaff") === "1";
  const targetId = asStaff ? idOf(formData.get("userId")) : user.id;
  if (asStaff) await requireAdmin();
  const existing = await getSignup(eventId, targetId);
  if (!existing) redirect(asStaff ? `/admin/events/${eventId}?error=missing` : `/portal/events/${eventId}?error=missing`);
  await (await getDb()).prepare("UPDATE signups SET status = 'cancelled' WHERE id = $1").run(existing.id);
  if (existing.status === "signed_up") await promoteWaitlist(eventId);
  if (!asStaff && targetId === user.id) {
    redirect(`/portal/events/${eventId}?saved=cancel`);
  }
  redirect(`/admin/events/${eventId}?saved=cancel`);
}

export async function markAttendanceAction(formData: FormData) {
  const admin = await requireAdmin();
  const signupId = idOf(formData.get("signupId"));
  const status = text(formData, "status");
  const signup = await (await getDb())
    .prepare("SELECT id, event_id, user_id, status FROM signups WHERE id = $1")
    .get(signupId) as { id: number; event_id: number; user_id: number; status: string } | undefined;
  const decision = attendanceDecision(signup?.status ?? "", status);
  if (!signup || !decision.ok) {
    redirect("/admin/events?error=missing");
  }
  await (await getDb()).prepare("UPDATE signups SET status = $1 WHERE id = $2").run(status, signupId);
  if (decision.recordHours) {
    const event = await getEvent(signup.event_id);
    if (event && !await hasHoursForEvent(signup.user_id, event.id)) {
      const servedOn = easternDateKey(event.starts_at);
      await insertHours({
        userId: signup.user_id,
        eventId: event.id,
        hours: event.hours_credit,
        servedOn,
        note: event.title,
        loggedBy: admin.id,
      });
    }
  }
  redirect(`/admin/events/${signup.event_id}?saved=attendance`);
}

export async function logHoursAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = idOf(formData.get("userId"));
  const eventId = idOf(formData.get("eventId"));
  const hours = Number(formData.get("hours"));
  const servedOn = text(formData, "servedOn");
  const note = text(formData, "note");
  const returnTo = adminPath(text(formData, "returnTo"), `/admin/people/${userId}`);
  if (!await getUser(userId) || !isYmd(servedOn) || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(withParam(returnTo, "error", "hours"));
  }
  if (eventId && !await getEvent(eventId)) redirect(withParam(returnTo, "error", "missing"));
  await insertHours({
    userId,
    eventId: eventId || null,
    hours,
    servedOn,
    note,
    loggedBy: admin.id,
  });
  if (eventId) {
    await (await getDb())
      .prepare("UPDATE signups SET status = 'attended' WHERE event_id = $1 AND user_id = $2 AND status = 'signed_up'")
      .run(eventId, userId);
  }
  redirect(withParam(returnTo, "saved", "hours"));
}
