import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { nowIso } from "./format";
import type { User } from "./types";

const COOKIE = "bp_session";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const USER_COLUMNS = `id, email, name, phone, role, account_status, background_check, availability, created_at`;

function plain<T>(row: Record<string, unknown> | undefined) {
  return row ? ({ ...row } as T) : undefined;
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = plain<User & { expires_at: string }>(
    db
      .prepare(
        `SELECT ${USER_COLUMNS}, s.expires_at AS expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`,
      )
      .get(token),
  );
  if (!row) return null;
  if (row.expires_at < nowIso()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const { expires_at: _expires, ...user } = row;
  return user;
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

export function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TWO_WEEKS_MS).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires);
  return token;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TWO_WEEKS_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export function verifyLogin(email: string, password: string) {
  const row = plain<User & { password_hash: string | null }>(
    getDb()
      .prepare(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`,
      )
      .get(email.trim().toLowerCase()),
  );
  if (!row?.password_hash) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  const { password_hash: _hash, ...user } = row;
  return user;
}
