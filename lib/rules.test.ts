import assert from "node:assert/strict";
import test from "node:test";
import { attendanceDecision, loginError, signupDecision } from "./rules.ts";
import { requireSessionSecret } from "./session-secret.ts";

const future = Date.now() + 60_000;
const past = Date.now() - 60_000;

test("login rejects a practice email when practice logins are off", () => {
  assert.equal(loginError("staff@brightpaths.test", false, true), "sample");
});

test("login rejects a wrong password and accepts a match", () => {
  assert.equal(loginError("maya@example.com", false, false), "credentials");
  assert.equal(loginError("maya@example.com", true, true), null);
  assert.equal(loginError("staff@brightpaths.test", true, true), null);
});

test("signup puts someone on the list or the waitlist", () => {
  const open = signupDecision({
    status: "open",
    startsAt: future,
    now: Date.now(),
    blocked: false,
    existingStatus: null,
    signedUp: 1,
    capacity: 2,
  });
  assert.deepEqual(open, { ok: true, status: "signed_up" });

  const full = signupDecision({
    status: "open",
    startsAt: future,
    now: Date.now(),
    blocked: false,
    existingStatus: null,
    signedUp: 2,
    capacity: 2,
  });
  assert.deepEqual(full, { ok: true, status: "waitlist" });
});

test("signup blocks a closed shift, a past shift, a qualification, and a second signup", () => {
  assert.equal(
    signupDecision({
      status: "cancelled",
      startsAt: future,
      now: Date.now(),
      blocked: false,
      existingStatus: null,
      signedUp: 0,
      capacity: 2,
    }).ok,
    false,
  );
  assert.equal(
    signupDecision({
      status: "open",
      startsAt: past,
      now: Date.now(),
      blocked: false,
      existingStatus: null,
      signedUp: 0,
      capacity: 2,
    }).error,
    "past",
  );
  assert.equal(
    signupDecision({
      status: "open",
      startsAt: future,
      now: Date.now(),
      blocked: true,
      existingStatus: null,
      signedUp: 0,
      capacity: 2,
    }).error,
    "qualify",
  );
  assert.equal(
    signupDecision({
      status: "open",
      startsAt: future,
      now: Date.now(),
      blocked: false,
      existingStatus: "signed_up",
      signedUp: 1,
      capacity: 2,
    }).error,
    "already",
  );
  assert.equal(
    signupDecision({
      status: "open",
      startsAt: future,
      now: Date.now(),
      blocked: false,
      existingStatus: "waitlist",
      signedUp: 2,
      capacity: 2,
    }).error,
    "already",
  );
});

test("a waitlisted person can take a spot that opens", () => {
  const moved = signupDecision({
    status: "open",
    startsAt: future,
    now: Date.now(),
    blocked: false,
    existingStatus: "waitlist",
    signedUp: 0,
    capacity: 2,
  });
  assert.deepEqual(moved, { ok: true, status: "signed_up" });
});

test("attendance records hours only for attended, and ignores a cancellation", () => {
  assert.deepEqual(attendanceDecision("signed_up", "attended"), { ok: true, recordHours: true });
  assert.deepEqual(attendanceDecision("signed_up", "no_show"), { ok: true, recordHours: false });
  assert.deepEqual(attendanceDecision("attended", "signed_up"), { ok: true, recordHours: false });
  assert.deepEqual(attendanceDecision("cancelled", "attended"), { ok: false });
  assert.deepEqual(attendanceDecision("signed_up", "waitlist"), { ok: false });
});

test("sign-in requires SESSION_SECRET", () => {
  const previous = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  assert.throws(() => requireSessionSecret(), /SESSION_SECRET/);
  process.env.SESSION_SECRET = "short";
  assert.throws(() => requireSessionSecret(), /SESSION_SECRET/);
  process.env.SESSION_SECRET = "a-long-random-session-secret";
  assert.equal(requireSessionSecret(), "a-long-random-session-secret");
  if (previous === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = previous;
});
