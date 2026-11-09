"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireAdmin, verifyLogin } from "../auth";
import { emailTaken } from "../data";
import { createBackup, getDb } from "../db";
import { idOf, isEmail, text, validPhone } from "../form";
import { nowIso } from "../format";
import { saveSite } from "../site";
import { readSiteForm } from "../site-copy";

export async function saveSiteAction(_prev: { error: string }, formData: FormData) {
  await requireAdmin();
  const result = readSiteForm(formData);
  if (!result.site) return { error: result.error || "Check the website text and try again." };
  try {
    await saveSite(result.site);
  } catch {
    return { error: "The website text could not be saved. Try again." };
  }
  redirect("/admin/site?saved=site");
}

export async function createStaffAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name").replace(/\s+/g, " ");
  const email = text(formData, "email").toLowerCase();
  const phone = text(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!name || !email) redirect("/admin/upkeep?error=missing");
  if (!isEmail(email)) redirect("/admin/upkeep?error=email");
  if (phone && !validPhone(phone)) redirect("/admin/upkeep?error=phone");
  if (password.length < 8) redirect("/admin/upkeep?error=password");
  if (password !== confirm) redirect("/admin/upkeep?error=match");
  if (await emailTaken(email)) redirect("/admin/upkeep?error=taken");
  await (await getDb())
    .prepare(
      `INSERT INTO users
        (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
       VALUES ($1, $2, $3, $4, 'admin', 'active', 'not_started', '', $5)`,
    )
    .run(email, bcrypt.hashSync(password, 10), name, phone, nowIso());
  redirect("/admin/upkeep?saved=staff");
}

export async function changeStaffPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("nextPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) redirect("/admin/upkeep?error=password");
  if (next !== confirm) redirect("/admin/upkeep?error=match");
  if (!await verifyLogin(admin.email, current)) redirect("/admin/upkeep?error=credentials");
  await (await getDb()).prepare("UPDATE users SET password_hash = $1 WHERE id = $2").run(bcrypt.hashSync(next, 10), admin.id);
  redirect("/admin/upkeep?saved=password");
}

export async function createBackupAction() {
  await requireAdmin();
  try {
    await createBackup();
  } catch {
    redirect("/admin/upkeep?error=backup");
  }
  redirect("/admin/upkeep?saved=backup");
}

export async function saveTagAction(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData.get("id"));
  const name = text(formData, "name").replace(/\s+/g, " ");
  const background = formData.get("background") === "1" ? 1 : 0;
  if (name.length < 2 || name.length > 60) redirect("/admin/site?error=tag");

  const db = (await getDb());
  const clash = await db.prepare("SELECT id FROM tags WHERE lower(name) = lower($1) AND id != $2").get(name, id) as
    | { id: number }
    | undefined;
  if (clash) redirect("/admin/site?error=tag");

  if (id) {
    const existing = await db.prepare("SELECT id FROM tags WHERE id = $1").get(id);
    if (!existing) redirect("/admin/site?error=tag");
    await db.prepare("UPDATE tags SET name = $1, requires_background = $2 WHERE id = $3").run(name, background, id);
  } else {
    await db.prepare("INSERT INTO tags (name, requires_background) VALUES ($1, $2)").run(name, background);
  }
  redirect("/admin/site?saved=tag");
}
