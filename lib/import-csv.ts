export type VolunteerImport = {
  name: string;
  email: string;
  phone: string;
  role: "volunteer" | "intern";
  availability: string;
  background: "not_started" | "pending" | "approved" | "expired";
  tags: string[];
};

type Field = "name" | "first" | "last" | "email" | "phone" | "role" | "availability" | "tags" | "background";

const SKIP_ROLE = /^(staff|admin|administrator|donor|board|board member)$/i;
const PLAIN_ROLE = /^(volunteer|intern|internship|active|current|member|yes)$/i;
const YES = /^(y|yes|x|true|1|checked|interested|✓|✔)$/i;
const NO = /^(n|no|false|0|na|n\/a|-)$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_LIKE = /^[a-z][a-z .'-]{0,60}$/i;

function headerKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function blocked(key: string) {
  if (!key) return false;
  if (/(password|passwd)/.test(key)) return true;
  if (key === "ssn" || key === "social" || key.includes("social_security")) return true;
  if (/(^|_)(dob|birth|birthday)(_|$)/.test(key) || key.includes("birth_date") || key.includes("date_of_birth")) {
    return true;
  }
  if (/(address|street|city|zip|postal|county)/.test(key)) return true;
  if (key === "state" || key === "st") return true;
  if (key.includes("student")) return true;
  if (/(account_number|card_number|credit|routing|bank)/.test(key)) return true;
  return false;
}

function fieldFor(key: string): Field | "blocked" | null {
  if (!key) return null;
  if (key.includes("email") || key === "e_mail" || key === "mail") return "email";
  if (blocked(key)) return "blocked";
  if (key === "first" || key === "first_name" || key === "firstname" || key === "given" || key === "given_name" || key === "fname") {
    return "first";
  }
  if (key === "last" || key === "last_name" || key === "lastname" || key === "surname" || key === "lname" || key === "family_name") {
    return "last";
  }
  if ((key === "name" || key.endsWith("_name")) && !/(emergency|parent|guardian|file|user)/.test(key)) {
    return "name";
  }
  if (key.includes("phone") || key.includes("mobile") || key === "cell" || key.startsWith("cell_") || key === "telephone") {
    return "phone";
  }
  if (key.includes("avail") || key.includes("schedule") || key === "days" || key.includes("preferred")) return "availability";
  if (key.includes("background") || key === "screening" || key === "cleared") return "background";
  if (key === "role" || key === "type" || key === "position" || key === "volunteer_type") return "role";
  if (
    key.includes("interest") ||
    key === "tags" ||
    key === "tag" ||
    key === "skills" ||
    key.includes("ways_to_help") ||
    key === "programs" ||
    key === "areas"
  ) {
    return "tags";
  }
  return null;
}

export function parseCsv(input: string) {
  const sample = input.slice(0, 4000);
  const commas = sample.split(",").length;
  const semis = sample.split(";").length;
  const tabs = sample.split("\t").length;
  const delimiter = tabs > commas && tabs > semis ? "\t" : semis > commas ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function splitList(value: string) {
  return value
    .split(/[;,|/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function backgroundOf(value: string): VolunteerImport["background"] {
  const text = value.toLowerCase();
  if (/expir/.test(text)) return "expired";
  if (/(approv|clear|pass|complet|\byes\b)/.test(text)) return "approved";
  if (/(pending|progress|submit|wait|process)/.test(text)) return "pending";
  return "not_started";
}

function headerIndex(table: string[][]) {
  let best = 0;
  let bestScore = 0;
  for (let index = 0; index < Math.min(table.length, 8); index += 1) {
    const score = table[index].reduce((total, cell) => {
      const field = fieldFor(headerKey(cell));
      return total + (field && field !== "blocked" ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : 0;
}

function columnValues(data: string[][], index: number) {
  return data.map((record) => (record[index] ?? "").trim()).filter(Boolean);
}

export function readVolunteerTable(table: string[][]):
  | { error: "columns" | "empty" | "large" }
  | { rows: VolunteerImport[]; skipped: number; omitted: boolean } {
  if (table.length < 2) return { error: "empty" };
  const headerAt = headerIndex(table);
  const labels = table[headerAt].map((cell) => cell.trim());
  const keys = labels.map(headerKey);
  const fields = keys.map(fieldFor);
  const data = table.slice(headerAt + 1).filter((record) => record.some((cell) => cell.trim()));
  if (!data.length) return { error: "empty" };
  if (data.length > 300) return { error: "large" };

  const findField = (field: Field) => fields.indexOf(field);
  let emailIndex = findField("email");
  let phoneIndex = findField("phone");
  let nameIndex = findField("name");
  const firstIndex = findField("first");
  const lastIndex = findField("last");
  if (nameIndex >= 0) {
    const values = columnValues(data, nameIndex);
    const answers = values.filter((value) => YES.test(value) || NO.test(value));
    if (values.length && answers.length * 2 >= values.length) nameIndex = -1;
  }
  if (emailIndex < 0) {
    emailIndex = keys.findIndex((_, index) => {
      if (fields[index] === "blocked") return false;
      const values = columnValues(data, index);
      return values.filter((value) => EMAIL.test(value)).length >= Math.max(1, Math.ceil(values.length * 0.5));
    });
  }
  if (phoneIndex < 0) {
    phoneIndex = keys.findIndex((_, index) => {
      if (fields[index] === "blocked" || index === emailIndex) return false;
      const values = columnValues(data, index);
      const phones = values.filter((value) => value.replace(/\D/g, "").length >= 10);
      return phones.length >= Math.max(1, Math.ceil(values.length * 0.5));
    });
  }
  if (nameIndex < 0 && firstIndex < 0) {
    nameIndex = keys.findIndex((_, index) => {
      if (fields[index] === "blocked" || index === emailIndex || index === phoneIndex) return false;
      const values = columnValues(data, index);
      const names = values.filter(
        (value) =>
          value.length <= 80 &&
          !value.includes("@") &&
          NAME_LIKE.test(value) &&
          !YES.test(value) &&
          !NO.test(value) &&
          !PLAIN_ROLE.test(value) &&
          !SKIP_ROLE.test(value),
      );
      return names.length >= Math.max(1, Math.ceil(values.length * 0.5));
    });
  }
  if (emailIndex < 0 || (nameIndex < 0 && firstIndex < 0 && lastIndex < 0)) return { error: "columns" };

  let roleIndex = findField("role");
  if (roleIndex >= 0) {
    const values = columnValues(data, roleIndex);
    const roleLike = values.filter((value) => PLAIN_ROLE.test(value) || SKIP_ROLE.test(value));
    if (values.length && roleLike.length * 2 < values.length) roleIndex = -1;
  }
  const tagIndexes = fields
    .map((field, index) => (field === "tags" || (fields[index] === "role" && index !== roleIndex) ? index : -1))
    .filter((index) => index >= 0);
  const yesIndexes = keys
    .map((_, index) => index)
    .filter((index) => {
      if (fields[index] || !labels[index] || labels[index].length > 40) return false;
      if (/(note|comment|emergency|guardian|parent|reference|shirt|hour)/.test(keys[index])) return false;
      const values = columnValues(data, index);
      if (!values.length) return false;
      const answers = values.filter((value) => YES.test(value) || NO.test(value));
      return answers.length >= Math.ceil(values.length * 0.7) && values.some((value) => YES.test(value));
    });

  const cell = (record: string[], index: number) => (index >= 0 ? (record[index] ?? "").trim() : "");
  const rows: VolunteerImport[] = [];
  let skipped = 0;
  for (const record of data) {
    const roleText = cell(record, roleIndex);
    if (roleText && SKIP_ROLE.test(roleText)) {
      skipped += 1;
      continue;
    }
    const name = (cell(record, nameIndex) || [cell(record, firstIndex), cell(record, lastIndex)].filter(Boolean).join(" "))
      .replace(/\s+/g, " ")
      .slice(0, 80);
    const email = cell(record, emailIndex).replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
    if (!name || !EMAIL.test(email)) {
      skipped += 1;
      continue;
    }
    const tags = [
      ...tagIndexes.flatMap((index) => splitList(cell(record, index))),
      ...yesIndexes.filter((index) => YES.test(cell(record, index))).map((index) => labels[index]),
    ];
    if (roleText && !PLAIN_ROLE.test(roleText)) tags.push(...splitList(roleText));
    rows.push({
      name,
      email,
      phone: cell(record, phoneIndex).slice(0, 30),
      role: /intern/i.test(roleText) ? "intern" : "volunteer",
      availability: cell(record, findField("availability")).slice(0, 200),
      background: backgroundOf(cell(record, findField("background"))),
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 8),
    });
  }
  if (!rows.length) return { error: "empty" };
  const omitted = fields.some((field, index) => labels[index] && field !== "name" && field !== "first" && field !== "last" && field !== "email" && field !== "phone" && field !== "role" && field !== "availability" && field !== "tags" && field !== "background" && !yesIndexes.includes(index));
  return { rows, skipped, omitted };
}

export function readVolunteerCsv(input: string) {
  return readVolunteerTable(parseCsv(input));
}

export function tagIdsForLabels(labels: string[], tags: { id: number; name: string }[]) {
  const ignore = new Set(["yes", "no", "volunteer", "intern", "active", "current", "member"]);
  const ids = new Set<number>();
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (!key || ignore.has(key)) continue;
    const exact = tags.find((tag) => tag.name.toLowerCase() === key);
    if (exact) {
      ids.add(exact.id);
      continue;
    }
    const compact = key.replace(/[^a-z0-9]/g, "");
    const compactHits = tags.filter((tag) => tag.name.toLowerCase().replace(/[^a-z0-9]/g, "") === compact);
    if (compactHits.length === 1) {
      ids.add(compactHits[0].id);
      continue;
    }
    if (key.length < 4) continue;
    const wordHits = tags.filter((tag) => tag.name.toLowerCase().split(/[^a-z0-9]+/).includes(key));
    if (wordHits.length === 1) ids.add(wordHits[0].id);
  }
  return [...ids];
}
