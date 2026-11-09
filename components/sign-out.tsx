"use client";

import { logoutAction } from "@/lib/actions/session";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button className="text-btn" type="submit">
        Sign out
      </button>
    </form>
  );
}
