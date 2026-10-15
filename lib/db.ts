import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { dayOffset, isoDaysFromNow, nextEasternLocal, nowIso } from "./format";

const globalForDb = globalThis as unknown as { brightpathsDb?: DatabaseSync };

const SEED_TAGS = [
  "First Steps bags",
  "Childcare",
  "Family Resource Closet",
  "Donation drives",
  "Events and community",
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  account_status TEXT NOT NULL,
  background_check TEXT NOT NULL DEFAULT 'not_started',
  availability TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id INTEGER NOT NULL REFERENCES users(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role_interest TEXT NOT NULL,
  why_join TEXT NOT NULL,
  experience TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  interests TEXT NOT NULL,
  volunteer_as TEXT NOT NULL DEFAULT 'individual',
  cadence TEXT NOT NULL DEFAULT 'ongoing',
  other_help TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  minimum_volunteers INTEGER NOT NULL,
  hours_credit REAL NOT NULL,
  required_background_check INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_tags (
  event_id INTEGER NOT NULL REFERENCES events(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (event_id, tag_id)
);

CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS hours_entries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER REFERENCES events(id),
  hours REAL NOT NULL,
  served_on TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  logged_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  filter_summary TEXT NOT NULL,
  sent_by INTEGER NOT NULL REFERENCES users(id),
  sent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_recipients (
  message_id INTEGER NOT NULL REFERENCES messages(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL
);
`;

function seed(db: DatabaseSync) {
  const run = (sql: string, ...params: Array<string | number | bigint | null>) =>
    Number(db.prepare(sql).run(...params).lastInsertRowid);
  const password = bcrypt.hashSync("pathway", 10);
  const created = nowIso();

  db.exec("BEGIN");
  try {
    const tagId: Record<string, number> = {};
    for (const name of SEED_TAGS) {
      tagId[name] = run("INSERT INTO tags (name) VALUES (?)", name);
    }

    const addUser = (input: {
      email: string;
      name: string;
      phone: string;
      role: string;
      account_status: string;
      background_check: string;
      availability: string;
      daysAgo?: number;
    }) =>
      run(
        `INSERT INTO users
          (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.email,
        password,
        input.name,
        input.phone,
        input.role,
        input.account_status,
        input.background_check,
        input.availability,
        isoDaysFromNow(-(input.daysAgo ?? 0), 9),
      );

    const tagUser = (userId: number, names: string[]) => {
      for (const name of names) {
        db.prepare("INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)").run(userId, tagId[name]);
      }
    };

    const staff = addUser({
      email: "staff@brightpaths.test",
      name: "Alex Morgan",
      phone: "706-555-0100",
      role: "admin",
      account_status: "active",
      background_check: "not_started",
      availability: "",
      daysAgo: 400,
    });

    const maya = addUser({
      email: "maya@brightpaths.test",
      name: "Maya Chen",
      phone: "706-555-0101",
      role: "volunteer",
      account_status: "active",
      background_check: "approved",
      availability: "Weekday mornings",
      daysAgo: 200,
    });
    const andre = addUser({
      email: "andre@brightpaths.test",
      name: "Andre Williams",
      phone: "706-555-0102",
      role: "volunteer",
      account_status: "active",
      background_check: "not_started",
      availability: "Weekends",
      daysAgo: 160,
    });
    const elena = addUser({
      email: "elena@brightpaths.test",
      name: "Elena Vasquez",
      phone: "706-555-0103",
      role: "volunteer",
      account_status: "active",
      background_check: "approved",
      availability: "Saturday afternoons",
      daysAgo: 90,
    });
    const priya = addUser({
      email: "priya@brightpaths.test",
      name: "Priya Shah",
      phone: "706-555-0104",
      role: "intern",
      account_status: "active",
      background_check: "not_started",
      availability: "Tuesday and Thursday afternoons",
      daysAgo: 60,
    });
    const luis = addUser({
      email: "luis@brightpaths.test",
      name: "Luis Ortega",
      phone: "706-555-0105",
      role: "volunteer",
      account_status: "alumni",
      background_check: "approved",
      availability: "No longer taking shifts",
      daysAgo: 500,
    });
    const hannah = addUser({
      email: "hannah@brightpaths.test",
      name: "Hannah Brooks",
      phone: "706-555-0106",
      role: "volunteer",
      account_status: "applicant",
      background_check: "not_started",
      availability: "Weekends and Thursday evenings",
      daysAgo: 1,
    });
    const jordan = addUser({
      email: "jordan@brightpaths.test",
      name: "Jordan Ellis",
      phone: "706-555-0107",
      role: "volunteer",
      account_status: "applicant",
      background_check: "not_started",
      availability: "Weekday afternoons",
      daysAgo: 6,
    });
    const sam = addUser({
      email: "sam@brightpaths.test",
      name: "Sam Patel",
      phone: "706-555-0108",
      role: "intern",
      account_status: "applicant",
      background_check: "pending",
      availability: "Tuesday and Thursday mornings",
      daysAgo: 9,
    });

    tagUser(maya, ["Childcare"]);
    tagUser(andre, ["Events and community"]);
    tagUser(elena, ["Events and community", "Family Resource Closet"]);
    tagUser(priya, ["First Steps bags", "Family Resource Closet"]);
    tagUser(luis, ["Childcare", "Events and community"]);

    const addApplication = (
      userId: number,
      role: string,
      why: string,
      experience: string,
      availability: string,
      interests: string[],
      status: string,
      daysAgo: number,
      volunteerAs = "individual",
      cadence = "ongoing",
    ) => {
      const stamp = isoDaysFromNow(-daysAgo, 10);
      return run(
        `INSERT INTO applications
          (user_id, role_interest, why_join, experience, availability, interests, volunteer_as, cadence, status, submitted_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        role,
        why,
        experience,
        availability,
        JSON.stringify(interests.map((name) => tagId[name])),
        volunteerAs,
        cadence,
        status,
        stamp,
        stamp,
      );
    };

    addApplication(
      maya,
      "volunteer",
      "I want to help with weekday parenting classes.",
      "I have volunteered in a church nursery for three years.",
      "Weekday mornings",
      ["Childcare"],
      "approved",
      200,
    );
    addApplication(
      andre,
      "volunteer",
      "I like setting up and hosting larger community events.",
      "I have staffed registration tables at campus fairs.",
      "Weekends",
      ["Events and community"],
      "approved",
      160,
    );
    addApplication(
      elena,
      "volunteer",
      "I can help with weekend events and education tables.",
      "I have talked with families at school resource fairs.",
      "Saturday afternoons",
      ["Events and community", "Family Resource Closet"],
      "approved",
      90,
    );
    addApplication(
      priya,
      "intern",
      "I am looking for an intern role with the office team this semester.",
      "I have done front-desk work and packet assembly.",
      "Tuesday and Thursday afternoons",
      ["First Steps bags", "Family Resource Closet"],
      "approved",
      60,
    );
    addApplication(
      luis,
      "volunteer",
      "I wanted to support childcare at parenting classes.",
      "I worked in after-school programs.",
      "Weekday evenings",
      ["Childcare", "Events and community"],
      "approved",
      500,
    );
    const hannahApp = addApplication(
      hannah,
      "volunteer",
      "I can help with weekend events or childcare.",
      "I have babysat for six years and I am comfortable with toddlers.",
      "Weekends and Thursday evenings",
      ["Childcare", "Events and community"],
      "submitted",
      1,
      "individual",
      "once",
    );
    addApplication(
      jordan,
      "volunteer",
      "Our church group would like an ongoing way to help families.",
      "I am a student and have presented at club meetings.",
      "Weekday afternoons",
      ["Family Resource Closet"],
      "interview",
      4,
      "church_group",
      "ongoing",
    );
    addApplication(
      sam,
      "intern",
      "I would like an intern role in the office, about 10 hours a week.",
      "I have sorted donations and answered phones for another local group.",
      "Tuesday and Thursday mornings",
      ["First Steps bags"],
      "background_check",
      8,
    );

    const addNote = (userId: number, body: string, daysAgo: number) =>
      run(
        "INSERT INTO notes (user_id, author_id, body, created_at) VALUES (?, ?, ?, ?)",
        userId,
        staff,
        body,
        isoDaysFromNow(-daysAgo, 15),
      );

    addNote(
      maya,
      "Reliable for weekday morning childcare. Background check approved in March. Families recognize her at parenting classes.",
      20,
    );
    addNote(
      andre,
      "Strong at large community events. Background check has not been started, so do not schedule him for childcare.",
      30,
    );
    addNote(
      priya,
      "Intern covering office packets and community education tabling. She has asked about moving into a volunteer role after the semester.",
      12,
    );
    addNote(
      luis,
      "Steady childcare volunteer from 2024 through spring 2026. Families asked for him by name. Left in good standing for a full-time job. Use this profile when he requests a reference letter.",
      45,
    );

    const addEvent = (input: {
      title: string;
      description: string;
      location: string;
      startDays: number;
      startHour: number;
      endHour: number;
      capacity: number;
      minimum: number;
      hours: number;
      background: number;
      status: string;
      tags: string[];
    }) => {
      const id = run(
        `INSERT INTO events
          (title, description, location, starts_at, ends_at, capacity, minimum_volunteers, hours_credit, required_background_check, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.title,
        input.description,
        input.location,
        isoDaysFromNow(input.startDays, input.startHour),
        isoDaysFromNow(input.startDays, input.endHour),
        input.capacity,
        input.minimum,
        input.hours,
        input.background,
        input.status,
        staff,
        created,
      );
      for (const name of input.tags) {
        db.prepare("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)").run(id, tagId[name]);
      }
      return id;
    };

    const office = "Brightpaths office, 1450 Barnett Shoals Road";
    const childcare = addEvent({
      title: "Parenting class childcare",
      description:
        "Keep children engaged while parents are in class. No formal experience is required. This shift needs an approved background check.",
      location: office,
      startDays: 2,
      startHour: 9,
      endHour: 12,
      capacity: 6,
      minimum: 4,
      hours: 3,
      background: 1,
      status: "open",
      tags: ["Childcare"],
    });
    const festival = addEvent({
      title: "Fall family festival",
      description: "Help with setup, welcome tables, and teardown at the office lawn.",
      location: "Outdoor lawn at the Brightpaths office",
      startDays: 6,
      startHour: 11,
      endHour: 15,
      capacity: 10,
      minimum: 6,
      hours: 4,
      background: 0,
      status: "open",
      tags: ["Events and community"],
    });
    const packets = addEvent({
      title: "First Steps bag building",
      description: "Assemble First Steps bags with essentials and resources for parents and their newborns.",
      location: office,
      startDays: 4,
      startHour: 13,
      endHour: 16,
      capacity: 3,
      minimum: 1,
      hours: 3,
      background: 0,
      status: "open",
      tags: ["First Steps bags"],
    });
    const fair = addEvent({
      title: "Community resource fair",
      description: "Staff the Brightpaths table and talk with families about programs.",
      location: office,
      startDays: 11,
      startHour: 10,
      endHour: 14,
      capacity: 8,
      minimum: 3,
      hours: 4,
      background: 0,
      status: "open",
      tags: ["Events and community"],
    });
    const yard = addEvent({
      title: "Donation drive sorting",
      description: "Sort donated diapers, wipes, and formula for the Family Resource Closet.",
      location: "Outdoor lawn at the Brightpaths office",
      startDays: -18,
      startHour: 9,
      endHour: 12,
      capacity: 8,
      minimum: 3,
      hours: 3,
      background: 0,
      status: "completed",
      tags: ["Donation drives"],
    });
    const tabling = addEvent({
      title: "Community event table",
      description: "Staff a Brightpaths table and talk with families at a community event.",
      location: office,
      startDays: -12,
      startHour: 10,
      endHour: 14,
      capacity: 4,
      minimum: 2,
      hours: 4,
      background: 0,
      status: "completed",
      tags: ["Events and community"],
    });
    const augustClass = addEvent({
      title: "August parenting class childcare",
      description: "Childcare coverage for the August parenting class.",
      location: office,
      startDays: -40,
      startHour: 9,
      endHour: 12,
      capacity: 4,
      minimum: 2,
      hours: 3,
      background: 1,
      status: "completed",
      tags: ["Childcare"],
    });
    const welcome = addEvent({
      title: "First Steps welcome table",
      description: "Greet families and hand out First Steps welcome materials.",
      location: office,
      startDays: -70,
      startHour: 10,
      endHour: 13,
      capacity: 4,
      minimum: 2,
      hours: 3,
      background: 0,
      status: "completed",
      tags: ["First Steps bags"],
    });
    const springClass = addEvent({
      title: "Spring parenting class childcare",
      description: "Childcare coverage from the spring class series.",
      location: office,
      startDays: -100,
      startHour: 9,
      endHour: 12,
      capacity: 4,
      minimum: 2,
      hours: 3,
      background: 1,
      status: "completed",
      tags: ["Childcare"],
    });
    const pastPackets = addEvent({
      title: "First Steps bag prep",
      description: "Assembled First Steps bags in the office.",
      location: office,
      startDays: -8,
      startHour: 13,
      endHour: 16,
      capacity: 3,
      minimum: 1,
      hours: 3,
      background: 0,
      status: "completed",
      tags: ["First Steps bags"],
    });

    const signup = (eventId: number, userId: number, status: string, daysAgo: number) =>
      run(
        "INSERT INTO signups (event_id, user_id, status, created_at) VALUES (?, ?, ?, ?)",
        eventId,
        userId,
        status,
        isoDaysFromNow(-daysAgo, 12),
      );

    signup(childcare, maya, "signed_up", 1);
    signup(festival, andre, "signed_up", 2);
    signup(packets, priya, "signed_up", 2);
    signup(fair, maya, "signed_up", 3);
    signup(fair, andre, "signed_up", 3);
    signup(fair, elena, "signed_up", 3);
    signup(yard, maya, "attended", 20);
    signup(yard, andre, "attended", 20);
    signup(yard, luis, "attended", 20);
    signup(tabling, elena, "attended", 14);
    signup(augustClass, maya, "attended", 42);
    signup(augustClass, luis, "attended", 42);
    signup(welcome, maya, "attended", 72);
    signup(welcome, luis, "attended", 72);
    signup(springClass, luis, "attended", 102);
    signup(pastPackets, priya, "attended", 9);

    const hours = (userId: number, eventId: number, amount: number, servedOn: string, note: string) =>
      run(
        `INSERT INTO hours_entries (user_id, event_id, hours, served_on, note, logged_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId,
        eventId,
        amount,
        servedOn,
        note,
        staff,
        created,
      );

    hours(maya, yard, 3, dayOffset(-18), "Donation drive");
    hours(andre, yard, 3, dayOffset(-18), "Donation drive");
    hours(elena, tabling, 4, dayOffset(-12), "Community event table");
    hours(priya, pastPackets, 3, dayOffset(-8), "First Steps bags");
    hours(maya, augustClass, 3, dayOffset(-40), "August childcare");
    hours(luis, augustClass, 3, dayOffset(-40), "August childcare");
    hours(maya, welcome, 3, dayOffset(-70), "Welcome table");
    hours(luis, welcome, 4, dayOffset(-70), "Welcome table");
    hours(luis, springClass, 5, dayOffset(-100), "Spring childcare");
    hours(luis, springClass, 4, dayOffset(-130), "Extra spring class coverage");

    const childcareMessage = run(
      `INSERT INTO messages (channel, subject, body, filter_summary, sent_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      "email",
      "Childcare help needed this week",
      "Parenting class childcare still has open spots. It is limited to people tagged for childcare with an approved background check. Sign in to the portal if you can take a shift.",
      "Active people · volunteers and interns · approved background check · must have Childcare",
      staff,
      isoDaysFromNow(-1, 8),
    );
    db.prepare("INSERT INTO message_recipients (message_id, user_id) VALUES (?, ?)").run(
      childcareMessage,
      maya,
    );

    const fairMessage = run(
      `INSERT INTO messages (channel, subject, body, filter_summary, sent_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      "sms",
      "",
      "Brightpaths resource fair still has open spots. Sign in to the volunteer portal to claim one.",
      "Active people · volunteers and interns",
      staff,
      isoDaysFromNow(-2, 16),
    );
    for (const person of [maya, andre, elena, priya]) {
      db.prepare("INSERT INTO message_recipients (message_id, user_id) VALUES (?, ?)").run(
        fairMessage,
        person,
      );
    }

    const notify = (
      userId: number,
      kind: string,
      title: string,
      body: string,
      href: string,
      daysAgo: number,
      unread: boolean,
    ) =>
      run(
        `INSERT INTO notifications (user_id, kind, title, body, href, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId,
        kind,
        title,
        body,
        href,
        unread ? null : isoDaysFromNow(-daysAgo, 18),
        isoDaysFromNow(-daysAgo, 11),
      );

    notify(
      staff,
      "application",
      "New volunteer application",
      "Hannah Brooks submitted a volunteer application.",
      `/admin/applications/${hannahApp}`,
      1,
      true,
    );
    notify(
      maya,
      "message",
      "New message from staff",
      "Childcare help needed this week",
      "/portal/messages",
      1,
      true,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function columnNames(db: DatabaseSync, table: string) {
  return new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((column) => column.name),
  );
}

function retag(db: DatabaseSync, fromId: number, toId: number) {
  db.prepare(
    `INSERT OR IGNORE INTO user_tags (user_id, tag_id)
     SELECT user_id, ? FROM user_tags WHERE tag_id = ?`,
  ).run(toId, fromId);
  db.prepare("DELETE FROM user_tags WHERE tag_id = ?").run(fromId);
  db.prepare(
    `INSERT OR IGNORE INTO event_tags (event_id, tag_id)
     SELECT event_id, ? FROM event_tags WHERE tag_id = ?`,
  ).run(toId, fromId);
  db.prepare("DELETE FROM event_tags WHERE tag_id = ?").run(fromId);
  db.prepare("DELETE FROM tags WHERE id = ?").run(fromId);
}

function renameTag(db: DatabaseSync, from: string, to: string) {
  const source = db.prepare("SELECT id FROM tags WHERE name = ?").get(from) as { id: number } | undefined;
  if (!source) return;
  const target = db.prepare("SELECT id FROM tags WHERE name = ?").get(to) as { id: number } | undefined;
  if (!target) {
    db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(to, source.id);
    return;
  }
  if (target.id !== source.id) retag(db, source.id, target.id);
}

function ensureExampleShift(
  db: DatabaseSync,
  input: {
    title: string;
    description: string;
    location: string;
    weekday: number;
    startHour: number;
    endHour: number;
    capacity: number;
    minimum: number;
    hours: number;
    background: number;
    tag: string;
  },
) {
  const start = nextEasternLocal(input.weekday, input.startHour);
  const end = nextEasternLocal(input.weekday, input.endHour);
  const staff = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get() as
    | { id: number }
    | undefined;
  const tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(input.tag) as { id: number } | undefined;
  if (!start || !end || !staff || !tag) return;

  const existing = db.prepare("SELECT id, starts_at FROM events WHERE title = ?").get(input.title) as
    | { id: number; starts_at: string }
    | undefined;
  if (!existing) {
    const id = Number(
      db.prepare(
        `INSERT INTO events
          (title, description, location, starts_at, ends_at, capacity, minimum_volunteers, hours_credit, required_background_check, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      ).run(
        input.title,
        input.description,
        input.location,
        start,
        end,
        input.capacity,
        input.minimum,
        input.hours,
        input.background,
        staff.id,
        nowIso(),
      ).lastInsertRowid,
    );
    db.prepare("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)").run(id, tag.id);
    return;
  }

  const signed = db
    .prepare("SELECT COUNT(*) AS n FROM signups WHERE event_id = ? AND status != 'cancelled'")
    .get(existing.id) as { n: number };
  if (new Date(existing.starts_at).getTime() < Date.now() && Number(signed.n) === 0) {
    db.prepare(
      "UPDATE events SET starts_at = ?, ends_at = ?, status = 'open', required_background_check = ? WHERE id = ?",
    ).run(start, end, input.background, existing.id);
  }
}

function alignVolunteerCatalog(db: DatabaseSync) {
  const applications = columnNames(db, "applications");
  if (!applications.has("volunteer_as")) {
    db.exec("ALTER TABLE applications ADD COLUMN volunteer_as TEXT NOT NULL DEFAULT 'individual'");
  }
  if (!applications.has("cadence")) {
    db.exec("ALTER TABLE applications ADD COLUMN cadence TEXT NOT NULL DEFAULT 'ongoing'");
  }
  if (!applications.has("other_help")) {
    db.exec("ALTER TABLE applications ADD COLUMN other_help TEXT NOT NULL DEFAULT ''");
  }

  db.exec(
    `UPDATE events SET required_background_check = 1
     WHERE id IN (
       SELECT et.event_id FROM event_tags et
       JOIN tags t ON t.id = et.tag_id
       WHERE t.name = 'Childcare'
     )`,
  );

  const office = "Brightpaths office, 1450 Barnett Shoals Road";
  ensureExampleShift(db, {
    title: "Saturday closet sub shift",
    description: "Fill in at the Family Resource Closet when a regular volunteer is out. Help families find clothing and supplies.",
    location: office,
    weekday: 6,
    startHour: 13,
    endHour: 16,
    capacity: 2,
    minimum: 1,
    hours: 3,
    background: 0,
    tag: "Family Resource Closet",
  });
  ensureExampleShift(db, {
    title: "Sunday community welcome",
    description: "Help welcome families at a weekend community gathering.",
    location: "Outdoor lawn at the Brightpaths office",
    weekday: 0,
    startHour: 11,
    endHour: 14,
    capacity: 8,
    minimum: 4,
    hours: 3,
    background: 0,
    tag: "Events and community",
  });
  ensureExampleShift(db, {
    title: "Thursday First Steps bags",
    description: "Assemble First Steps bags with essentials and resources for parents and their newborns.",
    location: office,
    weekday: 4,
    startHour: 13,
    endHour: 16,
    capacity: 4,
    minimum: 2,
    hours: 3,
    background: 0,
    tag: "First Steps bags",
  });
  ensureExampleShift(db, {
    title: "Wednesday parenting class childcare",
    description: "Keep children engaged while parents are in class. No formal experience is required. This shift needs an approved background check.",
    location: office,
    weekday: 3,
    startHour: 9,
    endHour: 12,
    capacity: 4,
    minimum: 2,
    hours: 3,
    background: 1,
    tag: "Childcare",
  });

  const legacy = db
    .prepare(
      "SELECT id FROM tags WHERE name IN ('Big events', 'Office & admin', 'Yard work', 'Community education', 'Parenting classes') LIMIT 1",
    )
    .get();
  if (!legacy) return;

  renameTag(db, "Big events", "Events and community");
  renameTag(db, "Office & admin", "First Steps bags");
  renameTag(db, "Yard work", "Donation drives");
  renameTag(db, "Community education", "Family Resource Closet");
  const childcare = db.prepare("SELECT id FROM tags WHERE name = ?").get("Childcare") as { id: number } | undefined;
  const parenting = db.prepare("SELECT id FROM tags WHERE name = ?").get("Parenting classes") as { id: number } | undefined;
  if (childcare && parenting) retag(db, parenting.id, childcare.id);

  const retitle = (from: string, title: string, description: string) => {
    db.prepare("UPDATE events SET title = ?, description = ? WHERE title = ?").run(title, description, from);
  };
  retitle(
    "Office: family resource packets",
    "First Steps bag building",
    "Assemble First Steps bags with essentials and resources for parents and their newborns.",
  );
  retitle(
    "Yard day at the office",
    "Donation drive sorting",
    "Sort donated diapers, wipes, and formula for the Family Resource Closet.",
  );
  retitle(
    "Community education tabling",
    "Community event table",
    "Staff a Brightpaths table and talk with families at a community event.",
  );
  retitle("Packet prep", "First Steps bag prep", "Assembled First Steps bags in the office.");
  db.prepare("UPDATE events SET description = ? WHERE title = ?").run(
    "Greet families and hand out First Steps welcome materials.",
    "First Steps welcome table",
  );
  db.prepare("UPDATE events SET description = ? WHERE title = ?").run(
    "Keep children engaged while parents are in class. No formal experience is required. This shift needs an approved background check.",
    "Parenting class childcare",
  );
  db.prepare("UPDATE hours_entries SET note = ? WHERE note = ?").run("Donation drive", "Yard day");
  db.prepare("UPDATE hours_entries SET note = ? WHERE note = ?").run("Community event table", "Education table");
  db.prepare("UPDATE hours_entries SET note = ? WHERE note = ?").run("First Steps bags", "Packet prep");
  db.prepare(
    `UPDATE applications SET cadence = 'once', volunteer_as = 'individual'
     WHERE user_id = (SELECT id FROM users WHERE email = 'hannah@brightpaths.test')`,
  ).run();
  db.prepare(
    `UPDATE applications
     SET volunteer_as = 'church_group',
         why_join = 'Our church group would like an ongoing way to help families.'
     WHERE user_id = (SELECT id FROM users WHERE email = 'jordan@brightpaths.test')`,
  ).run();
}

function databaseFile() {
  const dir = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return path.join(dir, "brightpaths.sqlite");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // Vercel functions have a read-only project directory. /tmp is the only writable path,
    // and it is wiped when a new instance starts, so data there does not last.
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") return "/tmp/brightpaths.sqlite";
    throw error;
  }
}

export function getDb() {
  if (!globalForDb.brightpathsDb) {
    const db = new DatabaseSync(databaseFile());
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec(SCHEMA);
    const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number } | undefined;
    if (!count || Number(count.n) === 0) seed(db);
    globalForDb.brightpathsDb = db;
  }
  alignVolunteerCatalog(globalForDb.brightpathsDb);
  return globalForDb.brightpathsDb;
}
