import { getDb } from "./db";
import { matchesAvailability, nowIso } from "./format";
import { qualificationIssues } from "./rules";

export { interestIds, qualificationIssues } from "./rules";
import type {
  ApplicationRow,
  ApplicationStatus,
  EventDetail,
  EventRow,
  HoursRow,
  MessageRow,
  NoteRow,
  NotificationRow,
  ParticipationRow,
  PeopleFilters,
  PersonRow,
  RecipientFilters,
  SignupRow,
  Tag,
  User,
} from "./types";

type Sql = string | number | bigint | null;

function plain<T>(row: Record<string, unknown> | undefined) {
  return row ? ({ ...row } as T) : undefined;
}

async function all<T>(sql: string, params: Sql[] = []) {
  const db = await getDb();
  const rows = await db.prepare(sql).all(...params);
  return rows.map((row) => ({ ...row }) as T);
}

async function one<T>(sql: string, params: Sql[] = []) {
  const db = await getDb();
  return plain<T>((await db.prepare(sql).get(...params)) as Record<string, unknown> | undefined);
}

function slot(params: Sql[], value: Sql) {
  params.push(value);
  return `$${params.length}`;
}

async function run(sql: string, params: Sql[] = []) {
  const db = await getDb();
  // Adds RETURNING id so the new row number comes back.
  const statement = /\bRETURNING\b/.test(sql) ? sql : `${sql.trim()} RETURNING id`;
  return Number((await db.prepare(statement).run(...params)).lastInsertRowid);
}

const PERSON_SELECT = `
  u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at,
  COALESCE(string_agg((t.name)::text, '||'), '') AS tag_names,
  COALESCE((SELECT SUM(h.hours) FROM hours_entries h WHERE h.user_id = u.id), 0) AS hours_total
`;

export async function listTags() {
  return await all<Tag>("SELECT id, name, requires_background FROM tags ORDER BY id");
}

export async function listStaff() {
  return await all<Pick<User, "id" | "name" | "email" | "phone">>(
    "SELECT id, name, email, phone FROM users WHERE role = 'admin' ORDER BY name",
  );
}

export async function listSampleAccounts() {
  return await all<Pick<User, "id" | "name" | "email">>(
    "SELECT id, name, email FROM users WHERE email ILIKE '%@brightpaths.test' ORDER BY email",
  );
}

export async function getUser(id: number) {
  return await one<User>(
    `SELECT id, email, name, phone, role, account_status, background_check, availability, created_at
     FROM users WHERE id = $1`,
    [id],
  );
}

export async function emailTaken(email: string) {
  return Boolean(await one("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]));
}

export async function listPeople(filters: PeopleFilters) {
  const clauses = ["u.role != 'admin'"];
  const params: Sql[] = [];
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_]/g, "")}%`;
    clauses.push(`(u.name ILIKE ${slot(params, like)} OR u.email ILIKE ${slot(params, like)})`);
  }
  if (filters.role === "volunteer" || filters.role === "intern") {
    clauses.push(`u.role = ${slot(params, filters.role)}`);
  }
  if (filters.statuses.length) {
    const marks = filters.statuses.map((status) => slot(params, status)).join(", ");
    clauses.push(`u.account_status IN (${marks})`);
  } else if (filters.status) {
    clauses.push(`u.account_status = ${slot(params, filters.status)}`);
  }
  if (filters.background) {
    clauses.push(`u.background_check = ${slot(params, filters.background)}`);
  }
  if (filters.tagId) {
    clauses.push(
      `(SELECT COUNT(*) FROM user_tags ut2 WHERE ut2.user_id = u.id AND ut2.tag_id = ${slot(params, filters.tagId)}) = 1`,
    );
  }
  return await all<PersonRow>(
    `SELECT ${PERSON_SELECT}
     FROM users u
     LEFT JOIN user_tags ut ON ut.user_id = u.id
     LEFT JOIN tags t ON t.id = ut.tag_id
     WHERE ${clauses.join(" AND ")}
     GROUP BY u.id
     ORDER BY u.name`,
    params,
  );
}

export async function getPerson(id: number) {
  return await one<PersonRow>(
    `SELECT ${PERSON_SELECT}
     FROM users u
     LEFT JOIN user_tags ut ON ut.user_id = u.id
     LEFT JOIN tags t ON t.id = ut.tag_id
     WHERE u.id = $1 AND u.role != 'admin'
     GROUP BY u.id`,
    [id],
  );
}

export async function tagIdsForUser(userId: number) {
  return (await all<{ tag_id: number }>("SELECT tag_id FROM user_tags WHERE user_id = $1", [userId])).map(
    (row) => row.tag_id,
  );
}

export async function tagIdsForUsers(userIds: number[]) {
  const map = new Map<number, number[]>();
  if (!userIds.length) return map;
  const params: Sql[] = [];
  const marks = userIds.map((id) => slot(params, id)).join(", ");
  const rows = await all<{ user_id: number; tag_id: number }>(
    `SELECT user_id, tag_id FROM user_tags WHERE user_id IN (${marks})`,
    params,
  );
  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.tag_id);
    map.set(row.user_id, list);
  }
  return map;
}

export async function listApplications(statuses?: ApplicationStatus[]) {
  const params: Sql[] = [];
  let where = "";
  if (statuses?.length) {
    const marks = statuses.map((status) => slot(params, status)).join(", ");
    where = `WHERE a.status IN (${marks})`;
  }
  return await all<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.updated_at DESC`,
    params,
  );
}

export async function applicationCounts() {
  const rows = await all<{ status: ApplicationStatus; n: number }>(
    "SELECT status, COUNT(*) AS n FROM applications GROUP BY status",
  );
  const counts: Record<string, number> = {
    submitted: 0,
    interview: 0,
    background_check: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of rows) counts[row.status] = Number(row.n);
  return counts;
}

export async function getApplication(id: number) {
  return await one<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [id],
  );
}

export async function getApplicationForUser(userId: number) {
  return await one<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1
     ORDER BY a.id DESC
     LIMIT 1`,
    [userId],
  );
}

export async function listNotes(userId: number) {
  return await all<NoteRow>(
    `SELECT n.*, u.name AS author_name
     FROM notes n
     JOIN users u ON u.id = n.author_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC`,
    [userId],
  );
}

export async function listEvents() {
  const events = await all<EventRow>("SELECT * FROM events ORDER BY starts_at");
  return Promise.all(events.map((event) => attachEvent(event)));
}

export async function getEvent(id: number) {
  const event = await one<EventRow>("SELECT * FROM events WHERE id = $1", [id]);
  return event ? await attachEvent(event) : undefined;
}

async function attachEvent(event: EventRow): Promise<EventDetail> {
  const tags = await all<Tag>(
    `SELECT t.id, t.name, t.requires_background
     FROM tags t
     JOIN event_tags et ON et.tag_id = t.id
     WHERE et.event_id = $1
     ORDER BY t.name`,
    [event.id],
  );
  const signed = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM signups WHERE event_id = $1 AND status = 'signed_up'",
    [event.id],
  );
  return { ...event, tags, signed_up: Number(signed?.n ?? 0) };
}

export async function listSignups(eventId: number) {
  return await all<SignupRow>(
    `SELECT s.id, s.event_id, s.user_id, s.status, s.created_at,
            u.name, u.email, u.phone, u.role, u.account_status, u.background_check
     FROM signups s
     JOIN users u ON u.id = s.user_id
     WHERE s.event_id = $1 AND s.status != 'cancelled'
     ORDER BY CASE s.status WHEN 'signed_up' THEN 0 WHEN 'attended' THEN 1 WHEN 'waitlist' THEN 2 ELSE 3 END, u.name`,
    [eventId],
  );
}

export async function getSignup(eventId: number, userId: number) {
  return await one<SignupRow>(
    `SELECT s.id, s.event_id, s.user_id, s.status, s.created_at,
            u.name, u.email, u.phone, u.role, u.account_status, u.background_check
     FROM signups s
     JOIN users u ON u.id = s.user_id
     WHERE s.event_id = $1 AND s.user_id = $2`,
    [eventId, userId],
  );
}

export async function listHours(input: { userId?: number; from?: string; to?: string }) {
  const clauses = ["1 = 1"];
  const params: Sql[] = [];
  if (input.userId) clauses.push(`h.user_id = ${slot(params, input.userId)}`);
  if (input.from) clauses.push(`h.served_on >= ${slot(params, input.from)}`);
  if (input.to) clauses.push(`h.served_on <= ${slot(params, input.to)}`);
  return await all<HoursRow>(
    `SELECT h.*, e.title AS event_title, u.name AS person_name
     FROM hours_entries h
     JOIN users u ON u.id = h.user_id
     LEFT JOIN events e ON e.id = h.event_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY h.served_on DESC, u.name`,
    params,
  );
}

export async function hoursByPerson(input: { from?: string; to?: string; userId?: number }) {
  const clauses = ["1 = 1"];
  const params: Sql[] = [];
  if (input.from) clauses.push(`h.served_on >= ${slot(params, input.from)}`);
  if (input.to) clauses.push(`h.served_on <= ${slot(params, input.to)}`);
  if (input.userId) clauses.push(`u.id = ${slot(params, input.userId)}`);
  return await all<{ id: number; name: string; role: User["role"]; account_status: User["account_status"]; hours: number }>(
    `SELECT u.id, u.name, u.role, u.account_status, COALESCE(SUM(h.hours), 0) AS hours
     FROM hours_entries h
     JOIN users u ON u.id = h.user_id
     WHERE ${clauses.join(" AND ")}
     GROUP BY u.id
     ORDER BY hours DESC, u.name`,
    params,
  );
}

export async function participationFor(userId: number) {
  return await all<ParticipationRow>(
    `SELECT s.id, s.status, e.title, e.starts_at, e.location, e.status AS event_status, e.id AS event_id
     FROM signups s
     JOIN events e ON e.id = s.event_id
     WHERE s.user_id = $1 AND s.status != 'cancelled'
     ORDER BY e.starts_at DESC`,
    [userId],
  );
}

export async function findRecipients(filters: RecipientFilters) {
  const clauses = ["u.role != 'admin'"];
  const params: Sql[] = [];
  clauses.push(
    filters.includeArchived
      ? "u.account_status IN ('active', 'inactive', 'alumni')"
      : "u.account_status = 'active'",
  );
  if (filters.role) clauses.push(`u.role = ${slot(params, filters.role)}`);
  if (filters.backgroundApproved) clauses.push("u.background_check = 'approved'");
  if (filters.tagIds.length) {
    const marks = filters.tagIds.map((tagId) => slot(params, tagId)).join(", ");
    clauses.push(
      `(SELECT COUNT(DISTINCT tag_id) FROM user_tags WHERE user_id = u.id AND tag_id IN (${marks})) = ${slot(params, filters.tagIds.length)}`,
    );
  }
  return await all<User>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at
     FROM users u
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.name`,
    params,
  );
}

export async function listMessages() {
  return await all<MessageRow>(
    `SELECT m.*, u.name AS sender_name,
            (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id) AS recipient_count
     FROM messages m
     JOIN users u ON u.id = m.sent_by
     ORDER BY m.sent_at DESC`,
  );
}

export async function getMessage(id: number) {
  return await one<MessageRow>(
    `SELECT m.*, u.name AS sender_name,
            (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id) AS recipient_count
     FROM messages m
     JOIN users u ON u.id = m.sent_by
     WHERE m.id = $1`,
    [id],
  );
}

export async function messageRecipients(messageId: number) {
  return await all<User>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at
     FROM users u
     JOIN message_recipients r ON r.user_id = u.id
     WHERE r.message_id = $1
     ORDER BY u.name`,
    [messageId],
  );
}

export async function messagesFor(userId: number) {
  return await all<MessageRow>(
    `SELECT m.*, u.name AS sender_name
     FROM messages m
     JOIN message_recipients r ON r.message_id = m.id
     JOIN users u ON u.id = m.sent_by
     WHERE r.user_id = $1
     ORDER BY m.sent_at DESC`,
    [userId],
  );
}

export async function listNotifications(userId: number) {
  return await all<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
}

export async function unreadCount(userId: number, kind?: string) {
  const row = kind
    ? await one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND kind = $2 AND read_at IS NULL",
        [userId, kind],
      )
    : await one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL",
        [userId],
      );
  return Number(row?.n ?? 0);
}

export async function markKindRead(userId: number, kind: string) {
  await (await getDb())
    .prepare("UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND kind = $3 AND read_at IS NULL")
    .run(nowIso(), userId, kind);
}

export async function notifyUser(userId: number, kind: string, title: string, body: string, href: string) {
  await run(
    `INSERT INTO notifications (user_id, kind, title, body, href, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, kind, title, body, href, nowIso()],
  );
}

export async function notifyAdmins(kind: string, title: string, body: string, href: string) {
  const admins = await all<{ id: number }>("SELECT id FROM users WHERE role = 'admin' AND account_status = 'active'");
  for (const admin of admins) await notifyUser(admin.id, kind, title, body, href);
}

export async function refreshUnderstaffedAlerts() {
  const events = (await listEvents()).filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return event.status === "open" && start > Date.now() && start < soon && event.signed_up < event.minimum_volunteers;
  });
  const hrefs = new Set(events.map((event) => `/admin/events/${event.id}`));
  const admins = await all<{ id: number }>("SELECT id FROM users WHERE role = 'admin'");
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  for (const admin of admins) {
    const existing = await all<NotificationRow>(
      "SELECT * FROM notifications WHERE user_id = $1 AND kind = 'understaffed' AND read_at IS NULL",
      [admin.id],
    );
    for (const note of existing) {
      if (!hrefs.has(note.href)) {
        await (await getDb()).prepare("DELETE FROM notifications WHERE id = $1").run(note.id);
      }
    }
    for (const event of events) {
      const href = `/admin/events/${event.id}`;
      const recent = await one(
        `SELECT id FROM notifications
         WHERE user_id = $1 AND kind = 'understaffed' AND href = $2
           AND (read_at IS NULL OR created_at > $3)`,
        [admin.id, href, threeDaysAgo],
      );
      if (recent) continue;
      await notifyUser(
        admin.id,
        "understaffed",
        "Event is short on volunteers",
        `${event.title} has ${event.signed_up} of ${event.minimum_volunteers} volunteers needed.`,
        href,
      );
    }
  }
  return events;
}

export async function dashboardStats() {
  const count = async (sql: string) => Number((await one<{ n: number }>(sql))?.n ?? 0);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const hours = await one<{ n: number }>(
    "SELECT COALESCE(SUM(hours), 0) AS n FROM hours_entries WHERE served_on >= $1",
    [monthStart],
  );
  return {
    volunteers: await count("SELECT COUNT(*) AS n FROM users WHERE role = 'volunteer' AND account_status = 'active'"),
    interns: await count("SELECT COUNT(*) AS n FROM users WHERE role = 'intern' AND account_status = 'active'"),
    applications: await count(
      "SELECT COUNT(*) AS n FROM applications WHERE status IN ('submitted', 'interview', 'background_check')",
    ),
    hoursThisMonth: Number(hours?.n ?? 0),
  };
}

export async function upcomingEvents(limit = 6) {
  return (await listEvents())
    .filter((event) => event.status === "open" && new Date(event.starts_at).getTime() >= Date.now())
    .slice(0, limit);
}

export async function suggestedEventsFor(user: User, tagIds: number[]) {
  if (user.account_status !== "active" || user.role === "admin") return [];
  const taken = new Set(
    (
      await all<{ event_id: number }>(
        `SELECT event_id FROM signups
       WHERE user_id = $1 AND status IN ('signed_up', 'waitlist', 'attended')`,
        [user.id],
      )
    ).map((row) => row.event_id),
  );
  return (await listEvents()).filter((event) => {
    if (event.status !== "open" || new Date(event.starts_at).getTime() < Date.now()) return false;
    if (taken.has(event.id)) return false;
    if (qualificationIssues(user, event, tagIds).length) return false;
    return matchesAvailability(user.availability, event.starts_at);
  });
}

export async function shortEventsFor(user: User, tagIds: number[]) {
  return (await listEvents()).filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (event.status !== "open" || start < Date.now() || start > soon) return false;
    if (event.signed_up >= event.minimum_volunteers) return false;
    return qualificationIssues(user, event, tagIds).length === 0;
  });
}

export async function replaceUserTags(userId: number, tagIds: number[]) {
  const known = new Set((await listTags()).map((tag) => tag.id));
  const ids = [...new Set(tagIds.filter((tagId) => known.has(tagId)))];
  const db = await getDb();
  await db.prepare("DELETE FROM user_tags WHERE user_id = $1").run(userId);
  const insert = db.prepare("INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)");
  for (const tagId of ids) await insert.run(userId, tagId);
}

export async function promoteWaitlist(eventId: number) {
  const event = await getEvent(eventId);
  if (!event || event.signed_up >= event.capacity) return;
  const next = await one<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM signups
     WHERE event_id = $1 AND status = 'waitlist'
     ORDER BY created_at ASC
     LIMIT 1`,
    [eventId],
  );
  if (!next) return;
  await (await getDb()).prepare("UPDATE signups SET status = 'signed_up' WHERE id = $1").run(next.id);
  await notifyUser(
    next.user_id,
    "signup",
    "A spot opened up",
    `You moved off the waitlist for ${event.title}.`,
    `/portal/events/${eventId}`,
  );
}

export async function hasHoursForEvent(userId: number, eventId: number) {
  return Boolean(
    await one("SELECT id FROM hours_entries WHERE user_id = $1 AND event_id = $2", [userId, eventId]),
  );
}

export async function insertHours(input: {
  userId: number;
  eventId: number | null;
  hours: number;
  servedOn: string;
  note: string;
  loggedBy: number;
}) {
  return await run(
    `INSERT INTO hours_entries (user_id, event_id, hours, served_on, note, logged_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.userId, input.eventId, input.hours, input.servedOn, input.note, input.loggedBy, nowIso()],
  );
}

// Applications start as applicants. Spreadsheet import does not use this.
export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: string;
  availability: string;
}) {
  return await run(
    `INSERT INTO users
      (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
     VALUES ($1, $2, $3, $4, $5, 'applicant', 'not_started', $6, $7)`,
    [input.email, input.passwordHash, input.name, input.phone, input.role, input.availability, nowIso()],
  );
}

export async function createApplication(input: {
  userId: number;
  role: string;
  why: string;
  experience: string;
  availability: string;
  interests: number[];
  volunteerAs: string;
  cadence: string;
  otherHelp: string;
}) {
  const stamp = nowIso();
  return await run(
    `INSERT INTO applications
      (user_id, role_interest, why_join, experience, availability, interests, volunteer_as, cadence, other_help, status, submitted_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', $10, $11)`,
    [
      input.userId,
      input.role,
      input.why,
      input.experience,
      input.availability,
      JSON.stringify(input.interests),
      input.volunteerAs,
      input.cadence,
      input.otherHelp,
      stamp,
      stamp,
    ],
  );
}

export { run };
