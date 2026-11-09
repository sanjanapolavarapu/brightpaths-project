"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, requireAdmin, setSessionCookie } from "../auth";
import { createApplication, createUser, emailTaken, getApplication, getUser, interestIds, listTags, notifyAdmins, notifyUser, replaceUserTags } from "../data";
import { getDb } from "../db";
import { idOf, isEmail, tagIdsFrom, text, validPhone } from "../form";
import { nowIso } from "../format";

export async function applyAction(_prev: { error: string }, formData: FormData) {
  const first = text(formData, "firstName");
  const last = text(formData, "lastName");
  const email = text(formData, "email").toLowerCase();
  const phone = text(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const role = text(formData, "role");
  const why = text(formData, "why");
  const experience = text(formData, "experience");
  const otherHelp = text(formData, "otherHelp");
  const availability = text(formData, "availability");
  const interests = tagIdsFrom(formData);
  const volunteerAs = text(formData, "volunteerAs");
  const cadence = text(formData, "cadence");
  const who = ["individual", "church_group", "corporate_group", "other"];
  const when = ["once", "ongoing"];

  if (!first || !last || !email || !phone || !availability || (role !== "volunteer" && role !== "intern")) {
    return { error: "Fill in every required field." };
  }
  if (!who.includes(volunteerAs) || !when.includes(cadence)) {
    return { error: "Choose who you are coming with, and whether you want a one-time or ongoing opportunity." };
  }
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  if (!validPhone(phone)) return { error: "Enter a phone number with 10 to 15 digits." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  if (!interests.length && !otherHelp) {
    return { error: "Choose at least one way to help, or describe another interest." };
  }
  if (why.length > 2000 || experience.length > 2000 || otherHelp.length > 500) {
    return { error: "Please shorten the written answers." };
  }
  if (await emailTaken(email)) return { error: "That email is already in the portal." };

  const knownTags = new Set((await listTags()).map((tag) => tag.id));
  if (interests.some((id) => !knownTags.has(id))) return { error: "Choose an interest from the list." };

  const userId = await createUser({
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    name: `${first} ${last}`.replace(/\s+/g, " "),
    phone,
    role,
    availability,
  });
  const applicationId = await createApplication({
    userId,
    role,
    why,
    experience,
    availability,
    interests,
    volunteerAs,
    cadence,
    otherHelp,
  });
  await notifyAdmins(
    "application",
    "New application",
    `${first} ${last} submitted a ${role} application.`,
    `/admin/applications/${applicationId}`,
  );
  await setSessionCookie(createSession(email));
  redirect("/portal?saved=applied");
}

export async function updateApplicationAction(formData: FormData) {
  await requireAdmin();
  const id = idOf(formData.get("id"));
  const status = text(formData, "status");
  const application = await getApplication(id);
  const allowed = ["submitted", "interview", "background_check", "approved", "rejected"];
  if (!application || !allowed.includes(status)) redirect("/admin/applications?error=missing");

  const user = await getUser(application.user_id);
  if (!user) redirect("/admin/applications?error=missing");
  const db = (await getDb());
  await db.prepare("UPDATE applications SET status = $1, updated_at = $2 WHERE id = $3").run(status, nowIso(), id);

  if (status === "approved" && application.status !== "approved") {
    await db.prepare("UPDATE users SET account_status = 'active', role = $1 WHERE id = $2").run(
      application.role_interest,
      user.id,
    );
    await replaceUserTags(user.id, interestIds(application.interests));
  } else if (application.status === "approved" && status !== "approved") {
    await db.prepare("UPDATE users SET account_status = 'applicant' WHERE id = $1").run(user.id);
  }

  if (status === "background_check" && user.background_check === "not_started") {
    await db.prepare("UPDATE users SET background_check = 'pending' WHERE id = $1").run(user.id);
  }

  const messages: Record<string, string> = {
    submitted: "Staff moved your application back to submitted.",
    interview: "Staff moved your application to the interview step.",
    background_check: "Staff are waiting on a background check.",
    approved: "Your application was approved. You can sign up for events that match your qualifications.",
    rejected: "Staff did not approve this application. Contact Brightpaths if you have a question.",
  };
  await notifyUser(user.id, "application", "Application update", messages[status], "/portal");
  redirect(`/admin/applications/${id}?saved=application`);
}
