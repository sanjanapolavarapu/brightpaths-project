import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import type { User } from "./types";

const COOKIE = "bp_session";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const USER_COLUMNS = `id, email, name, phone, role, account_status, background_check, availability, created_at`;

function plain<T>(row: Record<string, unknown> | undefined) {
  return row ? ({ ...row } as T) : undefined;
}

// Vercel runs each request on its own server, and the SQLite file on that
// server is not shared. A session row written at sign-in is invisible to the
// next request, which looks like an immediate sign-out. The cookie itself
// carries the account and a signature, so any server can check it.
function sessionSecret() {
  return process.env.SESSION_SECRET || "brightpaths-portal-session-v1";
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function encodeSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + TWO_WEEKS_MS })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

function readSession(token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const match = Buffer.from(expected);
  if (actual.length !== match.length || !timingSafeEqual(actual, match)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: unknown;
      exp?: unknown;
    };
    if (typeof data.email !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = readSession(token);
  if (!session) return null;
  const db = await getDb();
  return (
    plain<User>((await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).get(session.email)) as Record<string, unknown> | undefined) ??
    null
  );
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/portal");
  return user;
}

export function homeFor(user: User) {
  return user.role === "admin" ? "/admin" : "/portal";
}

export function createSession(email: string) {
  return encodeSession(email.trim().toLowerCase());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_WEEKS_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function verifyLogin(email: string, password: string) {
  const db = await getDb();
  const row = plain<User & { password_hash: string | null }>(
    (await db
      .prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`)
      .get(email.trim().toLowerCase())) as Record<string, unknown> | undefined,
  );
  if (!row?.password_hash) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  const { password_hash: _hash, ...user } = row;
  return user;
}
