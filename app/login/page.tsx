import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { Flash } from "@/components/ui";
import { loginAction } from "@/lib/actions";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { queryValue } from "@/lib/format";

export const metadata = { title: "Sign in" };

const samples = [
  ["Staff", "staff@brightpaths.test", "Dashboard, applications, alerts"],
  ["Volunteer", "maya@brightpaths.test", "Childcare, background check approved"],
  ["Volunteer", "andre@brightpaths.test", "Events and community, no background check"],
  ["Intern", "priya@brightpaths.test", "First Steps bags and the Family Resource Closet"],
  ["Alumni", "luis@brightpaths.test", "Archived profile for a reference"],
  ["Applicant", "hannah@brightpaths.test", "Application just submitted"],
];

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
        <div className="two login-grid">
          <section className="card stack">
            <h1>Good to see you</h1>
            <p className="muted">Sign in with the email and password you picked when you applied.</p>
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
          <section className="card stack">
            <h2>Try a sample login</h2>
            <p className="muted">
              Made-up people, for exploring the portal. The password for each one is pathway.
            </p>
            <ul className="account-list">
              {samples.map(([role, email, note]) => (
                <li key={email}>
                  <strong>{role}</strong>
                  <code>{email}</code>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
