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
