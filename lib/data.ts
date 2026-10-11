import { getDb } from "./db";
import { matchesAvailability, nowIso } from "./format";
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

function all<T>(sql: string, params: Sql[] = []) {
  return getDb()
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row }) as T);
}

function one<T>(sql: string, params: Sql[] = []) {
  return plain<T>(getDb().prepare(sql).get(...params) as Record<string, unknown> | undefined);
}

function run(sql: string, params: Sql[] = []) {
  return Number(getDb().prepare(sql).run(...params).lastInsertRowid);
}

const PERSON_SELECT = `
  u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at,
  COALESCE(GROUP_CONCAT(t.name, '||'), '') AS tag_names,
  COALESCE((SELECT SUM(h.hours) FROM hours_entries h WHERE h.user_id = u.id), 0) AS hours_total
`;

export function listTags() {
  return all<Tag>("SELECT id, name FROM tags ORDER BY name");
}

export function getUser(id: number) {
  return one<User>(
    `SELECT id, email, name, phone, role, account_status, background_check, availability, created_at
     FROM users WHERE id = ?`,
    [id],
  );
}

export function emailTaken(email: string) {
  return Boolean(one("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]));
}

export function listPeople(filters: PeopleFilters) {
  const clauses = ["u.role != 'admin'"];
  const params: Sql[] = [];
  if (filters.q) {
    clauses.push("(u.name LIKE ? OR u.email LIKE ?)");
    const like = `%${filters.q.replace(/[%_]/g, "")}%`;
    params.push(like, like);
  }
  if (filters.role === "volunteer" || filters.role === "intern") {
    clauses.push("u.role = ?");
    params.push(filters.role);
  }
  if (filters.statuses.length) {
    clauses.push(`u.account_status IN (${filters.statuses.map(() => "?").join(",")})`);
    params.push(...filters.statuses);
  } else if (filters.status) {
    clauses.push("u.account_status = ?");
    params.push(filters.status);
  }
  if (filters.background) {
    clauses.push("u.background_check = ?");
    params.push(filters.background);
  }
  if (filters.tagId) {
    clauses.push(
      "(SELECT COUNT(*) FROM user_tags ut2 WHERE ut2.user_id = u.id AND ut2.tag_id = ?) = 1",
    );
    params.push(filters.tagId);
  }
  return all<PersonRow>(
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

export function getPerson(id: number) {
  return one<PersonRow>(
    `SELECT ${PERSON_SELECT}
     FROM users u
     LEFT JOIN user_tags ut ON ut.user_id = u.id
     LEFT JOIN tags t ON t.id = ut.tag_id
     WHERE u.id = ? AND u.role != 'admin'
     GROUP BY u.id`,
    [id],
  );
}

export function tagIdsForUser(userId: number) {
  return all<{ tag_id: number }>("SELECT tag_id FROM user_tags WHERE user_id = ?", [userId]).map(
    (row) => row.tag_id,
  );
}

export function tagIdsForUsers(userIds: number[]) {
  const map = new Map<number, number[]>();
  if (!userIds.length) return map;
  const rows = all<{ user_id: number; tag_id: number }>(
    `SELECT user_id, tag_id FROM user_tags WHERE user_id IN (${userIds.map(() => "?").join(",")})`,
    userIds,
  );
  for (const row of rows) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.tag_id);
    map.set(row.user_id, list);
  }
  return map;
}

export function listApplications(statuses?: ApplicationStatus[]) {
  const params: Sql[] = [];
  let where = "";
  if (statuses?.length) {
    where = `WHERE a.status IN (${statuses.map(() => "?").join(",")})`;
    params.push(...statuses);
  }
  return all<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.updated_at DESC`,
    params,
  );
}

export function applicationCounts() {
  const rows = all<{ status: ApplicationStatus; n: number }>(
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

export function getApplication(id: number) {
  return one<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`,
    [id],
  );
}

export function getApplicationForUser(userId: number) {
  return one<ApplicationRow>(
    `SELECT a.*, u.name, u.email, u.phone
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.user_id = ?
     ORDER BY a.id DESC
     LIMIT 1`,
    [userId],
  );
}

export function listNotes(userId: number) {
  return all<NoteRow>(
    `SELECT n.*, u.name AS author_name
     FROM notes n
     JOIN users u ON u.id = n.author_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC`,
    [userId],
  );
}

export function listEvents() {
  const events = all<EventRow>("SELECT * FROM events ORDER BY starts_at");
  return events.map((event) => attachEvent(event));
}

export function getEvent(id: number) {
  const event = one<EventRow>("SELECT * FROM events WHERE id = ?", [id]);
  return event ? attachEvent(event) : undefined;
}

function attachEvent(event: EventRow): EventDetail {
  const tags = all<Tag>(
    `SELECT t.id, t.name
     FROM tags t
     JOIN event_tags et ON et.tag_id = t.id
     WHERE et.event_id = ?
     ORDER BY t.name`,
    [event.id],
  );
  const signed = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM signups WHERE event_id = ? AND status = 'signed_up'",
    [event.id],
  );
  return { ...event, tags, signed_up: Number(signed?.n ?? 0) };
}

export function listSignups(eventId: number) {
  return all<SignupRow>(
    `SELECT s.id, s.event_id, s.user_id, s.status, s.created_at,
            u.name, u.email, u.phone, u.role, u.account_status, u.background_check
     FROM signups s
     JOIN users u ON u.id = s.user_id
     WHERE s.event_id = ? AND s.status != 'cancelled'
     ORDER BY CASE s.status WHEN 'signed_up' THEN 0 WHEN 'attended' THEN 1 WHEN 'waitlist' THEN 2 ELSE 3 END, u.name`,
    [eventId],
  );
}

export function getSignup(eventId: number, userId: number) {
  return one<SignupRow>(
    `SELECT s.id, s.event_id, s.user_id, s.status, s.created_at,
            u.name, u.email, u.phone, u.role, u.account_status, u.background_check
     FROM signups s
     JOIN users u ON u.id = s.user_id
     WHERE s.event_id = ? AND s.user_id = ?`,
    [eventId, userId],
  );
}

export function listHours(input: { userId?: number; from?: string; to?: string }) {
  const clauses = ["1 = 1"];
  const params: Sql[] = [];
  if (input.userId) {
    clauses.push("h.user_id = ?");
    params.push(input.userId);
  }
  if (input.from) {
    clauses.push("h.served_on >= ?");
    params.push(input.from);
  }
  if (input.to) {
    clauses.push("h.served_on <= ?");
    params.push(input.to);
  }
  return all<HoursRow>(
    `SELECT h.*, e.title AS event_title, u.name AS person_name
     FROM hours_entries h
     JOIN users u ON u.id = h.user_id
     LEFT JOIN events e ON e.id = h.event_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY h.served_on DESC, u.name`,
    params,
  );
}

export function hoursByPerson(input: { from?: string; to?: string; userId?: number }) {
  const clauses = ["1 = 1"];
  const params: Sql[] = [];
  if (input.from) {
    clauses.push("h.served_on >= ?");
    params.push(input.from);
  }
  if (input.to) {
    clauses.push("h.served_on <= ?");
    params.push(input.to);
  }
  if (input.userId) {
    clauses.push("u.id = ?");
    params.push(input.userId);
  }
  return all<{ id: number; name: string; role: User["role"]; account_status: User["account_status"]; hours: number }>(
    `SELECT u.id, u.name, u.role, u.account_status, COALESCE(SUM(h.hours), 0) AS hours
     FROM hours_entries h
     JOIN users u ON u.id = h.user_id
     WHERE ${clauses.join(" AND ")}
     GROUP BY u.id
     ORDER BY hours DESC, u.name`,
    params,
  );
}

export function participationFor(userId: number) {
  return all<ParticipationRow>(
    `SELECT s.id, s.status, e.title, e.starts_at, e.location, e.status AS event_status, e.id AS event_id
     FROM signups s
     JOIN events e ON e.id = s.event_id
     WHERE s.user_id = ? AND s.status != 'cancelled'
     ORDER BY e.starts_at DESC`,
    [userId],
  );
}

export function findRecipients(filters: RecipientFilters) {
  const clauses = ["u.role != 'admin'"];
  const params: Sql[] = [];
  clauses.push(
    filters.includeArchived
      ? "u.account_status IN ('active', 'inactive', 'alumni')"
      : "u.account_status = 'active'",
  );
  if (filters.role) {
    clauses.push("u.role = ?");
    params.push(filters.role);
  }
  if (filters.backgroundApproved) clauses.push("u.background_check = 'approved'");
  if (filters.tagIds.length) {
    clauses.push(
      `(SELECT COUNT(DISTINCT tag_id) FROM user_tags WHERE user_id = u.id AND tag_id IN (${filters.tagIds.map(() => "?").join(",")})) = ?`,
    );
    params.push(...filters.tagIds, filters.tagIds.length);
  }
  return all<User>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at
     FROM users u
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.name`,
    params,
  );
}

export function listMessages() {
  return all<MessageRow>(
    `SELECT m.*, u.name AS sender_name,
            (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id) AS recipient_count
     FROM messages m
     JOIN users u ON u.id = m.sent_by
     ORDER BY m.sent_at DESC`,
  );
}

export function getMessage(id: number) {
  return one<MessageRow>(
    `SELECT m.*, u.name AS sender_name,
            (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id) AS recipient_count
     FROM messages m
     JOIN users u ON u.id = m.sent_by
     WHERE m.id = ?`,
    [id],
  );
}

export function messageRecipients(messageId: number) {
  return all<User>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.account_status, u.background_check, u.availability, u.created_at
     FROM users u
     JOIN message_recipients r ON r.user_id = u.id
     WHERE r.message_id = ?
     ORDER BY u.name`,
    [messageId],
  );
}

export function messagesFor(userId: number) {
  return all<MessageRow>(
    `SELECT m.*, u.name AS sender_name
     FROM messages m
     JOIN message_recipients r ON r.message_id = m.id
     JOIN users u ON u.id = m.sent_by
     WHERE r.user_id = ?
     ORDER BY m.sent_at DESC`,
    [userId],
  );
}

export function listNotifications(userId: number) {
  return all<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

export function unreadCount(userId: number, kind?: string) {
  const row = kind
    ? one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND kind = ? AND read_at IS NULL",
        [userId, kind],
      )
    : one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
        [userId],
      );
  return Number(row?.n ?? 0);
}

export function markKindRead(userId: number, kind: string) {
  getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND kind = ? AND read_at IS NULL")
    .run(nowIso(), userId, kind);
}

export function notifyUser(userId: number, kind: string, title: string, body: string, href: string) {
  run(
    `INSERT INTO notifications (user_id, kind, title, body, href, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, kind, title, body, href, nowIso()],
  );
}

export function notifyAdmins(kind: string, title: string, body: string, href: string) {
  const admins = all<{ id: number }>("SELECT id FROM users WHERE role = 'admin' AND account_status = 'active'");
  for (const admin of admins) notifyUser(admin.id, kind, title, body, href);
}

export function refreshUnderstaffedAlerts() {
  const events = listEvents().filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return event.status === "open" && start > Date.now() && start < soon && event.signed_up < event.minimum_volunteers;
  });
  const hrefs = new Set(events.map((event) => `/admin/events/${event.id}`));
  const admins = all<{ id: number }>("SELECT id FROM users WHERE role = 'admin'");
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  for (const admin of admins) {
    const existing = all<NotificationRow>(
      "SELECT * FROM notifications WHERE user_id = ? AND kind = 'understaffed' AND read_at IS NULL",
      [admin.id],
    );
    for (const note of existing) {
      if (!hrefs.has(note.href)) {
        getDb().prepare("DELETE FROM notifications WHERE id = ?").run(note.id);
      }
    }
    for (const event of events) {
      const href = `/admin/events/${event.id}`;
      const recent = one(
        `SELECT id FROM notifications
         WHERE user_id = ? AND kind = 'understaffed' AND href = ?
           AND (read_at IS NULL OR created_at > ?)`,
        [admin.id, href, threeDaysAgo],
      );
      if (recent) continue;
      notifyUser(
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

export function dashboardStats() {
  const count = (sql: string) => Number(one<{ n: number }>(sql)?.n ?? 0);
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const hours = one<{ n: number }>(
    "SELECT COALESCE(SUM(hours), 0) AS n FROM hours_entries WHERE served_on >= ?",
    [monthStart],
  );
  return {
    volunteers: count("SELECT COUNT(*) AS n FROM users WHERE role = 'volunteer' AND account_status = 'active'"),
    interns: count("SELECT COUNT(*) AS n FROM users WHERE role = 'intern' AND account_status = 'active'"),
    applications: count(
      "SELECT COUNT(*) AS n FROM applications WHERE status IN ('submitted', 'interview', 'background_check')",
    ),
    hoursThisMonth: Number(hours?.n ?? 0),
  };
}

export function upcomingEvents(limit = 6) {
  return listEvents()
    .filter((event) => event.status === "open" && new Date(event.starts_at).getTime() >= Date.now())
    .slice(0, limit);
}

export function suggestedEventsFor(user: User, tagIds: number[]) {
  if (user.account_status !== "active" || user.role === "admin") return [];
  const taken = new Set(
    all<{ event_id: number }>(
      `SELECT event_id FROM signups
       WHERE user_id = ? AND status IN ('signed_up', 'waitlist', 'attended')`,
      [user.id],
    ).map((row) => row.event_id),
  );
  return listEvents().filter((event) => {
    if (event.status !== "open" || new Date(event.starts_at).getTime() < Date.now()) return false;
    if (taken.has(event.id)) return false;
    if (qualificationIssues(user, event, tagIds).length) return false;
    return matchesAvailability(user.availability, event.starts_at);
  });
}

export function shortEventsFor(user: User, tagIds: number[]) {
  return listEvents().filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (event.status !== "open" || start < Date.now() || start > soon) return false;
    if (event.signed_up >= event.minimum_volunteers) return false;
    return qualificationIssues(user, event, tagIds).length === 0;
  });
}

export function qualificationIssues(
  user: Pick<User, "role" | "account_status" | "background_check">,
  event: Pick<EventDetail, "required_background_check" | "tags">,
  tagIds: number[],
) {
  const issues: string[] = [];
  if (user.role === "admin") issues.push("Staff accounts don't take shifts. Thanks for keeping an eye on them.");
  if (user.account_status === "applicant") {
    issues.push("You can sign up once staff approve your application. Thanks for waiting.");
  } else if (user.account_status !== "active") {
    issues.push("This profile is resting, so new shifts are closed. Your hours are still here.");
  }
  if (event.required_background_check && user.background_check !== "approved") {
    issues.push("This shift needs an approved background check first.");
  }
  const missing = event.tags.filter((tag) => !tagIds.includes(tag.id));
  if (missing.length) {
    issues.push(`This one is for people tagged ${missing.map((tag) => tag.name).join(", ")}. Ask staff if that should be on your profile.`);
  }
  return issues;
}

export function replaceUserTags(userId: number, tagIds: number[]) {
  const db = getDb();
  db.prepare("DELETE FROM user_tags WHERE user_id = ?").run(userId);
  const insert = db.prepare("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)");
  for (const tagId of tagIds) insert.run(userId, tagId);
}

export function promoteWaitlist(eventId: number) {
  const event = getEvent(eventId);
  if (!event || event.signed_up >= event.capacity) return;
  const next = one<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM signups
     WHERE event_id = ? AND status = 'waitlist'
     ORDER BY created_at ASC
     LIMIT 1`,
    [eventId],
  );
  if (!next) return;
  getDb().prepare("UPDATE signups SET status = 'signed_up' WHERE id = ?").run(next.id);
  notifyUser(
    next.user_id,
    "signup",
    "A spot opened up",
    `You moved off the waitlist for ${event.title}.`,
    `/portal/events/${eventId}`,
  );
}

export function hasHoursForEvent(userId: number, eventId: number) {
  return Boolean(
    one("SELECT id FROM hours_entries WHERE user_id = ? AND event_id = ?", [userId, eventId]),
  );
}

export function insertHours(input: {
  userId: number;
  eventId: number | null;
  hours: number;
  servedOn: string;
  note: string;
  loggedBy: number;
}) {
  return run(
    `INSERT INTO hours_entries (user_id, event_id, hours, served_on, note, logged_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.userId, input.eventId, input.hours, input.servedOn, input.note, input.loggedBy, nowIso()],
  );
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: string;
  availability: string;
}) {
  return run(
    `INSERT INTO users
      (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
     VALUES (?, ?, ?, ?, ?, 'applicant', 'not_started', ?, ?)`,
    [input.email, input.passwordHash, input.name, input.phone, input.role, input.availability, nowIso()],
  );
}

export function createApplication(input: {
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
  return run(
    `INSERT INTO applications
      (user_id, role_interest, why_join, experience, availability, interests, volunteer_as, cadence, other_help, status, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
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
