"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, createSession, homeFor, sampleLoginsOpen, setSessionCookie, verifyLogin } from "../auth";
import { text } from "../form";
import { loginError } from "../rules";

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (loginError(email, sampleLoginsOpen(), true) === "sample") redirect("/login?error=sample");
  const user = await verifyLogin(email, password);
  if (loginError(email, sampleLoginsOpen(), Boolean(user)) || !user) redirect("/login?error=credentials");
  await setSessionCookie(createSession(user.email));
  redirect(homeFor(user));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
