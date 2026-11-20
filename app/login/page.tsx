import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { Flash } from "@/components/ui";
import { loginAction } from "@/lib/actions/session";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { queryValue } from "@/lib/format";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const params = await searchParams;
  return (
    <>
      <PublicHeader>
        <Link href="/apply">Apply</Link>
      </PublicHeader>
      <main className="public-main stage" id="content">
        <div className="login-grid">
          <section className="card stack">
            <h1>Sign in</h1>
            <Flash error={queryValue(params.error)} />
            <form className="stack" action={loginAction}>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="btn" type="submit">
                Sign in
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
