import type {
  AccountStatus,
  ApplicationStatus,
  BackgroundCheck,
  EventStatus,
  RecipientFilters,
  Role,
  SignupStatus,
  Tag,
} from "./types";

const TIME_ZONE = "America/New_York";

export function nowIso() {
  return new Date().toISOString();
}

export function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoDaysFromNow(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function easternDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function currentEasternMonth() {
  const key = easternDateKey(new Date().toISOString());
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function formatWhen(iso: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${formatted} ET`;
}

export function formatDay(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) return ymd;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatHours(hours: number) {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
}

function zoneOffsetMs(utcDate: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(utcDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcDate.getTime();
}

export function easternLocalToIso(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const [date, time] = local.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  let offset = zoneOffsetMs(guess);
  let utc = guess.getTime() - offset;
  offset = zoneOffsetMs(new Date(utc));
  utc = guess.getTime() - offset;
  return new Date(utc).toISOString();
}

export function monthMatrix(year: number, month: number) {
  const startPad = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let index = 0; index < startPad; index += 1) cells.push({ date: null, day: null });
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function tagList(names: string | null | undefined) {
  if (!names) return [];
  return names.split("||").filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function volunteerAsLabel(value: string) {
  if (value === "church_group") return "Church group";
  if (value === "corporate_group") return "Corporate group";
  if (value === "other") return "Other";
  return "Individual";
}

export function cadenceLabel(value: string) {
  return value === "once" ? "One-time" : "Ongoing";
}

export function roleLabel(role: Role | "volunteer" | "intern") {
  if (role === "admin") return "Staff";
  if (role === "intern") return "Intern";
  return "Volunteer";
}

export function statusLabel(status: AccountStatus) {
  if (status === "applicant") return "Applicant";
  if (status === "inactive") return "Inactive";
  if (status === "alumni") return "Alumni";
  return "Active";
}

export function backgroundLabel(status: BackgroundCheck) {
  if (status === "not_started") return "Not started";
  if (status === "pending") return "Pending";
  if (status === "expired") return "Expired";
  return "Approved";
}

export function applicationLabel(status: ApplicationStatus) {
  if (status === "submitted") return "Submitted";
  if (status === "interview") return "Interview";
  if (status === "background_check") return "Background check";
  if (status === "rejected") return "Not accepted";
  return "Approved";
}

export function eventStatusLabel(status: EventStatus) {
  if (status === "draft") return "Draft";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  return "Open";
}

export function signupLabel(status: SignupStatus) {
  if (status === "signed_up") return "Signed up";
  if (status === "waitlist") return "Waitlist";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "No show";
  return "Attended";
}

export function describeFilters(filters: RecipientFilters, tags: Tag[]) {
  const parts = [
    filters.includeArchived ? "Active, inactive, and alumni" : "Active people",
    filters.role === "volunteer"
      ? "volunteers"
      : filters.role === "intern"
        ? "interns"
        : "volunteers and interns",
  ];
  if (filters.backgroundApproved) parts.push("approved background check");
  if (filters.tagIds.length) {
    const names = tags.filter((tag) => filters.tagIds.includes(tag.id)).map((tag) => tag.name);
    if (names.length) parts.push(`must have ${names.join(" and ")}`);
  }
  return parts.join(" · ");
}

export function dateRange(params: { range?: string; from?: string; to?: string }) {
  if (params.from || params.to) {
    return {
      from: params.from ?? "",
      to: params.to ?? "",
      label: "Custom dates",
      key: "custom",
    };
  }
  if (params.range === "all") {
    return { from: "", to: "", label: "All recorded hours", key: "all" };
  }
  if (params.range === "quarter") {
    return { from: dayOffset(-90), to: dayOffset(0), label: "Last 3 months", key: "quarter" };
  }
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return { from, to: dayOffset(0), label: "This month", key: "month" };
}

export function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function easternClock(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      weekday: "long",
      hour: "2-digit",
    })
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hourText = parts.hour === "24" ? "0" : parts.hour;
  return {
    weekday: String(parts.weekday ?? "").toLowerCase(),
    hour: Number(hourText),
  };
}

function addCalendarDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function nextEasternLocal(weekday: number, hour: number) {
  const today = easternDateKey(new Date().toISOString());
  for (let ahead = 1; ahead <= 21; ahead += 1) {
    const ymd = addCalendarDays(today, ahead);
    const [year, month, day] = ymd.split("-").map(Number);
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== weekday) continue;
    return easternLocalToIso(`${ymd}T${String(hour).padStart(2, "0")}:00`);
  }
  return null;
}

export function matchesAvailability(availability: string, startsAt: string) {
  const text = availability.toLowerCase();
  if (!text.trim()) return true;
  if (/\b(no longer|not available|unavailable)\b/.test(text)) return false;

  const days = new Set<string>();
  for (const day of WEEKDAYS) {
    if (text.includes(day)) days.add(day);
  }
  if (/\bweekdays?\b/.test(text)) {
    for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) days.add(day);
  }
  if (/\bweekends?\b/.test(text)) {
    days.add("saturday");
    days.add("sunday");
  }

  const windows: Array<[number, number]> = [];
  if (text.includes("morning")) windows.push([5, 12]);
  if (text.includes("afternoon")) windows.push([12, 17]);
  if (text.includes("evening") || text.includes("night")) windows.push([17, 22]);

  const clock = easternClock(startsAt);
  if (days.size && !days.has(clock.weekday)) return false;
  if (windows.length && !windows.some(([start, end]) => clock.hour >= start && clock.hour < end)) return false;
  return true;
}

export function isoToEasternLocal(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}
