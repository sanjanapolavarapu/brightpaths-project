export function qualificationIssues(
  user: { role: string; account_status: string; background_check: string },
  event: { required_background_check: number; tags: { id: number; name: string }[] },
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

export function interestIds(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
}

export function loginError(email: string, samplesOpen: boolean, matched: boolean) {
  if (!samplesOpen && email.endsWith("@brightpaths.test")) return "sample" as const;
  if (!matched) return "credentials" as const;
  return null;
}

export function signupDecision(input: {
  status: string;
  startsAt: number;
  now: number;
  blocked: boolean;
  existingStatus: string | null;
  signedUp: number;
  capacity: number;
}) {
  if (input.status !== "open") return { ok: false as const, error: "closed" as const };
  if (input.startsAt < input.now) return { ok: false as const, error: "past" as const };
  if (input.blocked) return { ok: false as const, error: "qualify" as const };
  const openSpots = input.signedUp < input.capacity;
  const already =
    input.existingStatus === "signed_up" ||
    input.existingStatus === "attended" ||
    (input.existingStatus === "waitlist" && !openSpots);
  if (already) return { ok: false as const, error: "already" as const };
  return { ok: true as const, status: openSpots ? ("signed_up" as const) : ("waitlist" as const) };
}

export function attendanceDecision(current: string, next: string) {
  const allowed = next === "attended" || next === "no_show" || next === "signed_up";
  if (!current || current === "cancelled" || !allowed) return { ok: false as const };
  return { ok: true as const, recordHours: next === "attended" };
}
