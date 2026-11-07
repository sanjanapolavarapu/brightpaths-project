"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  createSession,
  homeFor,
  requireAdmin,
  requireUser,
  setSessionCookie,
  verifyLogin,
} from "./auth";
import {
  createApplication,
  createUser,
  emailTaken,
  findRecipients,
  getApplication,
  getEvent,
  getSignup,
  getUser,
  hasHoursForEvent,
  insertHours,
  listTags,
  notifyAdmins,
  notifyUser,
  promoteWaitlist,
  qualificationIssues,
  replaceUserTags,
  tagIdsForUser,
} from "./data";
import { describeFilters, easternLocalToIso, isYmd, nowIso } from "./format";
import { createBackup, getDb } from "./db";
import { readVolunteerCsv, readVolunteerTable, tagIdsForLabels } from "./import-csv";
import { saveSite } from "./site";
import { readSiteForm } from "./site-copy";
import type { RecipientFilters } from "./types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function idOf(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function tagIdsFrom(formData: FormData) {
  return formData
    .getAll("tag")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function filtersFrom(formData: FormData): RecipientFilters {
  const role = text(formData, "role");
  return {
    role: role === "volunteer" || role === "intern" ? role : "",
    backgroundApproved: formData.get("background") === "approved",
    includeArchived: formData.get("archived") === "1",
    tagIds: tagIdsFrom(formData),
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (process.env.NODE_ENV === "production" && email.endsWith("@brightpaths.test")) {
    redirect("/login?error=sample");
  }
  const user = await verifyLogin(email, password);
  if (!user) redirect("/login?error=credentials");
  await setSessionCookie(createSession(user.email));
  redirect(homeFor(user));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function applyAction(_prev: { error: string }, formData: FormData) {
  const first = text(formData, "firstName");
  const last = text(formData, "lastName");
  const email = text(formData, "email").toLowerCase();
  const phone = text(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const role = text(formData, "role");
  const why = text(formData, "why");
  const experience = text(formData, "experience");
  const otherHelp = text(formData, "otherHelp");
  const availability = text(formData, "availability");
  const interests = tagIdsFrom(formData);
  const volunteerAs = text(formData, "volunteerAs");
  const cadence = text(formData, "cadence");
  const digits = phone.replace(/\D/g, "");
  const who = ["individual", "church_group", "corporate_group", "other"];
  const when = ["once", "ongoing"];

  if (!first || !last || !email || !phone || !availability || (role !== "volunteer" && role !== "intern")) {
    return { error: "Fill in every required field." };
  }
  if (!who.includes(volunteerAs) || !when.includes(cadence)) {
    return { error: "Choose who you are coming with, and whether you want a one-time or ongoing opportunity." };
  }
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  if (digits.length < 10 || digits.length > 15) return { error: "Enter a phone number with at least 10 digits." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  if (!interests.length && !otherHelp) {
    return { error: "Choose at least one way to help, or describe another interest." };
  }
  if (why.length > 2000 || experience.length > 2000 || otherHelp.length > 500) {
    return { error: "Please shorten the written answers." };
  }
  if (await emailTaken(email)) return { error: "That email is already in the portal." };

  const knownTags = new Set((await listTags()).map((tag) => tag.id));
  if (interests.some((id) => !knownTags.has(id))) return { error: "Choose an interest from the list." };

  const userId = await createUser({
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    name: `${first} ${last}`.replace(/\s+/g, " "),
    phone,
    role,
    availability,
  });
  const applicationId = await createApplication({
    userId,
    role,
    why,
    experience,
    availability,
    interests,
    volunteerAs,
    cadence,
    otherHelp,
  });
  await notifyAdmins(
    "application",
    "New application",
    `${first} ${last} submitted a ${role} application.`,
    `/admin/applications/${applicationId}`,
  );
  await setSessionCookie(createSession(email));
  redirect("/portal?saved=applied");
}

export async function updateApplicationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idOf(formData.get("id"));
  const status = text(formData, "status");
  const application = await getApplication(id);
  const allowed = ["submitted", "interview", "background_check", "approved", "rejected"];
  if (!application || !allowed.includes(status)) redirect("/admin/applications?error=missing");

  const user = await getUser(application.user_id);
  if (!user) redirect("/admin/applications?error=missing");
  const db = (await getDb());
  await db.prepare("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);

  if (status === "approved" && application.status !== "approved") {
    await db.prepare("UPDATE users SET account_status = 'active', role = ? WHERE id = ?").run(
      application.role_interest,
      user.id,
    );
    let interests: number[] = [];
    try {
      const parsed = JSON.parse(application.interests) as unknown;
      if (Array.isArray(parsed)) interests = parsed.filter((tagId) => Number.isInteger(tagId));
    } catch {
      interests = [];
    }
    await replaceUserTags(user.id, interests);
  } else if (application.status === "approved" && status !== "approved") {
    await db.prepare("UPDATE users SET account_status = 'applicant' WHERE id = ?").run(user.id);
  }

  if (status === "background_check" && user.background_check === "not_started") {
    await db.prepare("UPDATE users SET background_check = 'pending' WHERE id = ?").run(user.id);
  }

  const messages: Record<string, string> = {
    submitted: "Staff moved your application back to submitted.",
    interview: "Staff moved your application to the interview step.",
    background_check: "Staff are waiting on a background check.",
    approved: "Your application was approved. You can sign up for events that match your qualifications.",
    rejected: "Staff did not approve this application. Contact Brightpaths if you have a question.",
  };
  await notifyUser(user.id, "application", "Application update", messages[status], "/portal");
  void admin;
  redirect(`/admin/applications/${id}?saved=application`);
}

export async function savePersonAction(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData.get("id"));
  const person = await getUser(id);
  if (!person || person.role === "admin") redirect("/admin/people?error=person");
  const role = text(formData, "role");
  const account = text(formData, "account_status");
  const background = text(formData, "background_check");
  const phone = text(formData, "phone");
  const availability = text(formData, "availability");
  const roles = ["volunteer", "intern"];
  const accounts = ["applicant", "active", "inactive", "alumni"];
  const checks = ["not_started", "pending", "approved", "expired"];
  if (!roles.includes(role) || !accounts.includes(account) || !checks.includes(background)) {
    redirect(`/admin/people/${id}?error=missing`);
  }
  await (await getDb())
    .prepare(
      `UPDATE users
       SET role = ?, account_status = ?, background_check = ?, phone = ?, availability = ?
       WHERE id = ?`,
    )
    .run(role, account, background, phone, availability, id);
  const known = new Set((await listTags()).map((tag) => tag.id));
  await replaceUserTags(id, tagIdsFrom(formData).filter((tagId) => known.has(tagId)));
  redirect(`/admin/people/${id}?saved=profile`);
}

export async function addNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idOf(formData.get("id"));
  const body = text(formData, "body");
  if (!await getUser(id) || !body || body.length > 2000) redirect(`/admin/people/${id}?error=missing`);
  await (await getDb())
    .prepare("INSERT INTO notes (user_id, author_id, body, created_at) VALUES (?, ?, ?, ?)")
    .run(id, admin.id, body, nowIso());
  redirect(`/admin/people/${id}?saved=note`);
}

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireUser();
  const phone = text(formData, "phone");
  const availability = text(formData, "availability");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) redirect("/portal/profile?error=missing");
  await (await getDb()).prepare("UPDATE users SET phone = ?, availability = ? WHERE id = ?").run(phone, availability, user.id);

  const nextPassword = String(formData.get("nextPassword") ?? "");
  const current = String(formData.get("currentPassword") ?? "");
  if (nextPassword || current) {
    if (nextPassword.length < 8) redirect("/portal/profile?error=password");
    if (!await verifyLogin(user.email, current)) redirect("/portal/profile?error=credentials");
    await (await getDb())
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(bcrypt.hashSync(nextPassword, 10), user.id);
    redirect("/portal/profile?saved=password");
  }
  redirect("/portal/profile?saved=contact");
}

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
       SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?, capacity = ?, minimum_volunteers = ?,
           hours_credit = ?, required_background_check = ?, status = ?
       WHERE id = ?`,
    ).run(title, description, location, starts, ends, capacity, minimum, hours, background, status, id);
    await db.prepare("DELETE FROM event_tags WHERE event_id = ?").run(id);
  } else {
    eventId = Number(
      (
        await db.prepare(
          `INSERT INTO events
          (title, description, location, starts_at, ends_at, capacity, minimum_volunteers, hours_credit, required_background_check, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const insert = await db.prepare("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)");
  for (const tagId of selectedTags) await insert.run(eventId, tagId);
  redirect(`/admin/events/${eventId}?saved=event`);
}

export async function signupAction(formData: FormData) {
  const user = await requireUser();
  const eventId = idOf(formData.get("eventId"));
  const event = await getEvent(eventId);
  if (!event || event.status !== "open") redirect(`/portal/events/${eventId || ""}?error=closed`);
  if (new Date(event.starts_at).getTime() < Date.now()) redirect(`/portal/events/${eventId}?error=past`);
  const issues = qualificationIssues(user, event, await tagIdsForUser(user.id));
  if (issues.length) redirect(`/portal/events/${eventId}?error=qualify`);

  const existing = await getSignup(eventId, user.id);
  if (existing && (existing.status === "signed_up" || existing.status === "attended")) {
    redirect(`/portal/events/${eventId}?error=already`);
  }
  const openSpots = event.signed_up < event.capacity;
  const status = openSpots ? "signed_up" : "waitlist";
  if (existing) {
    await (await getDb()).prepare("UPDATE signups SET status = ?, created_at = ? WHERE id = ?").run(status, nowIso(), existing.id);
  } else {
    await (await getDb())
      .prepare("INSERT INTO signups (event_id, user_id, status, created_at) VALUES (?, ?, ?, ?)")
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
  await (await getDb()).prepare("UPDATE signups SET status = 'cancelled' WHERE id = ?").run(existing.id);
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
    .prepare("SELECT id, event_id, user_id, status FROM signups WHERE id = ?")
    .get(signupId) as { id: number; event_id: number; user_id: number } | undefined;
  if (!signup || (status !== "attended" && status !== "no_show" && status !== "signed_up")) {
    redirect("/admin/events?error=missing");
  }
  await (await getDb()).prepare("UPDATE signups SET status = ? WHERE id = ?").run(status, signupId);
  if (status === "attended") {
    const event = await getEvent(signup.event_id);
    if (event && !await hasHoursForEvent(signup.user_id, event.id)) {
      const servedOn = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(event.starts_at));
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
  const requested = text(formData, "returnTo");
  const returnTo = requested.startsWith("/admin/") && !requested.startsWith("//") ? requested : `/admin/people/${userId}`;
  if (!await getUser(userId) || !isYmd(servedOn) || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    redirect(`${returnTo}?error=hours`);
  }
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
      .prepare("UPDATE signups SET status = 'attended' WHERE event_id = ? AND user_id = ? AND status = 'signed_up'")
      .run(eventId, userId);
  }
  redirect(`${returnTo}?saved=hours`);
}

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
  const summary = describeFilters(filters, await listTags());
  const messageId = Number(
    (
    await (await getDb())
      .prepare(
        `INSERT INTO messages (channel, subject, body, filter_summary, sent_by, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(channel, channel === "email" ? subject : "", body, summary, admin.id, nowIso())
    ).lastInsertRowid,
  );
  const insert = await (await getDb()).prepare("INSERT INTO message_recipients (message_id, user_id) VALUES (?, ?)");
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
    await (await getDb()).prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(nowIso(), admin.id);
  } else if (id) {
    await (await getDb())
      .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?")
      .run(nowIso(), id, admin.id);
  }
  redirect("/admin/alerts?saved=read");
}

export async function markPortalMessagesReadAction() {
  const user = await requireUser();
  await (await getDb())
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND kind = 'message' AND read_at IS NULL")
    .run(nowIso(), user.id);
}

export async function saveSiteAction(_prev: { error: string }, formData: FormData) {
  await requireAdmin();
  const result = readSiteForm(formData);
  if (!result.site) return { error: result.error || "Check the website text and try again." };
  saveSite(result.site);
  redirect("/admin/site?saved=site");
}

export async function createStaffAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name").replace(/\s+/g, " ");
  const email = text(formData, "email").toLowerCase();
  const phone = text(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!name || !email) redirect("/admin/upkeep?error=missing");
  if (!isEmail(email)) redirect("/admin/upkeep?error=email");
  if (phone && phone.replace(/\D/g, "").length < 10) redirect("/admin/upkeep?error=phone");
  if (password.length < 8) redirect("/admin/upkeep?error=password");
  if (password !== confirm) redirect("/admin/upkeep?error=match");
  if (await emailTaken(email)) redirect("/admin/upkeep?error=taken");
  await (await getDb())
    .prepare(
      `INSERT INTO users
        (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
       VALUES (?, ?, ?, ?, 'admin', 'active', 'not_started', '', ?)`,
    )
    .run(email, bcrypt.hashSync(password, 10), name, phone, nowIso());
  redirect("/admin/upkeep?saved=staff");
}

export async function changeStaffPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("nextPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) redirect("/admin/upkeep?error=password");
  if (next !== confirm) redirect("/admin/upkeep?error=match");
  if (!await verifyLogin(admin.email, current)) redirect("/admin/upkeep?error=credentials");
  await (await getDb()).prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(next, 10), admin.id);
  redirect("/admin/upkeep?saved=password");
}

export async function createBackupAction() {
  await requireAdmin();
  try {
    await createBackup();
  } catch {
    redirect("/admin/upkeep?error=backup");
  }
  redirect("/admin/upkeep?saved=backup");
}

export async function saveTagAction(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData.get("id"));
  const name = text(formData, "name").replace(/\s+/g, " ");
  const background = formData.get("background") === "1" ? 1 : 0;
  if (name.length < 2 || name.length > 60) redirect("/admin/site?error=tag");

  const db = (await getDb());
  const clash = await db.prepare("SELECT id FROM tags WHERE lower(name) = lower(?) AND id != ?").get(name, id) as
    | { id: number }
    | undefined;
  if (clash) redirect("/admin/site?error=tag");

  if (id) {
    const existing = await db.prepare("SELECT id FROM tags WHERE id = ?").get(id);
    if (!existing) redirect("/admin/site?error=tag");
    await db.prepare("UPDATE tags SET name = ?, requires_background = ? WHERE id = ?").run(name, background, id);
  } else {
    await db.prepare("INSERT INTO tags (name, requires_background) VALUES (?, ?)").run(name, background);
  }
  redirect("/admin/site?saved=tag");
}

export async function importVolunteersAction(formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirect("/admin/people?error=password");
  if (password !== confirm) redirect("/admin/people?error=match");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/people?error=csv");
  if (file.size > 2_000_000) redirect("/admin/people?error=large");
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".xls") || filename.endsWith(".numbers")) redirect("/admin/people?error=format");
  let parsed: ReturnType<typeof readVolunteerCsv>;
  try {
    parsed = filename.endsWith(".xlsx")
      ? readVolunteerTable(await (await import("./import-sheet")).readXlsx(Buffer.from(await file.arrayBuffer())))
      : readVolunteerCsv(await file.text());
  } catch {
    redirect("/admin/people?error=format");
  }
  if ("error" in parsed) redirect(`/admin/people?error=${parsed.error}`);
  const tags = await listTags();
  const db = await getDb();
  const stamp = nowIso();
  let added = 0;
  let skipped = parsed.skipped;
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const digits = row.phone.replace(/\D/g, "");
    const phone = digits.length >= 10 ? row.phone : "";
    if (!row.name || !isEmail(row.email) || seen.has(row.email)) {
      skipped += 1;
      continue;
    }
    seen.add(row.email);
    if (await emailTaken(row.email)) {
      skipped += 1;
      continue;
    }
    const inserted = await db
      .prepare(
        `INSERT INTO users
          (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      )
      .run(row.email, bcrypt.hashSync(password, 10), row.name, phone, row.role, row.background, row.availability, stamp);
    const id = Number(inserted.lastInsertRowid);
    if (!id) {
      skipped += 1;
      continue;
    }
    const tagIds = tagIdsForLabels(row.tags, tags);
    if (tagIds.length) await replaceUserTags(id, tagIds);
    added += 1;
  }
  const omitted = parsed.omitted ? "&omitted=1" : "";
  redirect(`/admin/people?saved=import&added=${added}&skipped=${skipped}${omitted}`);
}
