"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser, verifyLogin } from "../auth";
import { emailTaken, getUser, listTags, replaceUserTags } from "../data";
import { getDb } from "../db";
import { idOf, isEmail, tagIdsFrom, text, uniqueEmail, validPhone } from "../form";
import { nowIso } from "../format";
import { readVolunteerCsv, readVolunteerTable, tagIdsForLabels } from "../import-csv";

export async function savePersonAction(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData.get("id"));
  const person = await getUser(id);
  if (!person || person.role === "admin") redirect("/admin/people?error=person");
  const role = text(formData, "role");
  const account = text(formData, "account_status");
  const background = text(formData, "background_check");
  const phone = text(formData, "phone");
  const availability = text(formData, "availability");
  const roles = ["volunteer", "intern"];
  const accounts = ["applicant", "active", "inactive", "alumni"];
  const checks = ["not_started", "pending", "approved", "expired"];
  if (!roles.includes(role) || !accounts.includes(account) || !checks.includes(background)) {
    redirect(`/admin/people/${id}?error=missing`);
  }
  if (phone && !validPhone(phone)) redirect(`/admin/people/${id}?error=phone`);
  await (await getDb())
    .prepare(
      `UPDATE users
       SET role = $1, account_status = $2, background_check = $3, phone = $4, availability = $5
       WHERE id = $6`,
    )
    .run(role, account, background, phone, availability, id);
  const known = new Set((await listTags()).map((tag) => tag.id));
  await replaceUserTags(id, tagIdsFrom(formData).filter((tagId) => known.has(tagId)));
  redirect(`/admin/people/${id}?saved=profile`);
}

export async function addNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idOf(formData.get("id"));
  const body = text(formData, "body");
  if (!await getUser(id) || !body || body.length > 2000) redirect(`/admin/people/${id}?error=missing`);
  await (await getDb())
    .prepare("INSERT INTO notes (user_id, author_id, body, created_at) VALUES ($1, $2, $3, $4)")
    .run(id, admin.id, body, nowIso());
  redirect(`/admin/people/${id}?saved=note`);
}

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireUser();
  const phone = text(formData, "phone");
  const availability = text(formData, "availability");
  if (!validPhone(phone)) redirect("/portal/profile?error=phone");
  await (await getDb()).prepare("UPDATE users SET phone = $1, availability = $2 WHERE id = $3").run(phone, availability, user.id);

  const nextPassword = String(formData.get("nextPassword") ?? "");
  const current = String(formData.get("currentPassword") ?? "");
  if (nextPassword || current) {
    if (nextPassword.length < 8) redirect("/portal/profile?error=password");
    if (!await verifyLogin(user.email, current)) redirect("/portal/profile?error=credentials");
    await (await getDb())
      .prepare("UPDATE users SET password_hash = $1 WHERE id = $2")
      .run(bcrypt.hashSync(nextPassword, 10), user.id);
    redirect("/portal/profile?saved=password");
  }
  redirect("/portal/profile?saved=contact");
}

export async function importVolunteersAction(formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirect("/admin/people?error=password");
  if (password !== confirm) redirect("/admin/people?error=match");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/people?error=csv");
  if (file.size > 2_000_000) redirect("/admin/people?error=large");
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".xls") || filename.endsWith(".numbers")) redirect("/admin/people?error=format");
  let parsed: ReturnType<typeof readVolunteerCsv>;
  try {
    parsed = filename.endsWith(".xlsx")
      ? readVolunteerTable(await (await import("../import-sheet")).readXlsx(Buffer.from(await file.arrayBuffer())))
      : readVolunteerCsv(await file.text());
  } catch {
    redirect("/admin/people?error=format");
  }
  if ("error" in parsed) redirect(`/admin/people?error=${parsed.error}`);
  const tags = await listTags();
  const db = await getDb();
  const stamp = nowIso();
  let added = 0;
  let skipped = parsed.skipped;
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const digits = row.phone.replace(/\D/g, "");
    const phone = digits.length >= 10 && digits.length <= 15 ? row.phone : "";
    if (!row.name || !isEmail(row.email) || seen.has(row.email)) {
      skipped += 1;
      continue;
    }
    seen.add(row.email);
    if (await emailTaken(row.email)) {
      skipped += 1;
      continue;
    }
    let inserted: { lastInsertRowid: number };
    try {
      inserted = await db
        .prepare(
          `INSERT INTO users
            (email, password_hash, name, phone, role, account_status, background_check, availability, created_at)
           VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)
           RETURNING id`,
        )
        .run(row.email, bcrypt.hashSync(password, 10), row.name, phone, row.role, row.background, row.availability, stamp);
    } catch (error) {
      if (!uniqueEmail(error)) throw error;
      skipped += 1;
      continue;
    }
    const id = Number(inserted.lastInsertRowid);
    if (!id) {
      skipped += 1;
      continue;
    }
    const tagIds = tagIdsForLabels(row.tags, tags);
    if (tagIds.length) await replaceUserTags(id, tagIds);
    added += 1;
  }
  const omitted = parsed.omitted ? "&omitted=1" : "";
  redirect(`/admin/people?saved=import&added=${added}&skipped=${skipped}${omitted}`);
}

