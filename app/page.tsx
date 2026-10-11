import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { getCurrentUser, homeFor } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <>
      <PublicHeader>
        <Link href="/apply">Apply</Link>
        {user ? (
          <Link className="btn" href={homeFor(user)}>
            Open portal
          </Link>
        ) : (
          <Link className="btn" href="/login">
            Sign in
          </Link>
        )}
      </PublicHeader>
      <main className="public-main" id="content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Athens families</p>
            <h1>Show up for a family. We&apos;ll handle the rest of the paperwork.</h1>
            <p className="lede">
              Help with First Steps bags, childcare, the Family Resource Closet, donation drives, or community events.
              Apply in a few minutes, or sign in to see the shifts already waiting.
            </p>
            <div className="hero-actions">
              <Link className="btn" href="/apply">
                Start an application
              </Link>
              <Link className="btn-gold" href="/login">
                Sign in
              </Link>
            </div>
          </div>
          <aside className="hero-panel">
            <p className="eyebrow">From hello to a shift</p>
            <ol>
              <li>Share how you like to help, and when you can usually be here.</li>
              <li>Staff follow your application through interview and approval.</li>
              <li>Open the calendar and take a shift that fits.</li>
              <li>Hours add up here, ready to print when you need them.</li>
            </ol>
          </aside>
        </section>
        <section className="feature-row">
          <article>
            <p className="num">01</p>
            <h2>A short form</h2>
            <p>Volunteer or intern. Staff see it as soon as you send it, and they&apos;ll take it from there.</p>
          </article>
          <article>
            <p className="num">02</p>
            <h2>Your interests</h2>
            <p>
              First Steps bags, childcare, the closet, donation drives, and events. Childcare shifts include a
              background check.
            </p>
          </article>
          <article>
            <p className="num">03</p>
            <h2>A day that fits</h2>
            <p>Sign up for shifts you qualify for. Short ones show up before the week gets away.</p>
          </article>
          <article>
            <p className="num">04</p>
            <h2>Hours that stay</h2>
            <p>Every hour is kept. Print them for school, a job, or just to look back.</p>
          </article>
        </section>
        <section className="audience">
          <article className="audience-staff">
            <h2>For staff</h2>
            <p>
              See new applications, who can help this week, and which days are still short.
            </p>
          </article>
          <article className="audience-volunteer">
            <h2>For volunteers and interns</h2>
            <p>
              Follow your application, pick up a shift, and keep a running total of the time you&apos;ve given.
            </p>
          </article>
        </section>
      </main>
      <footer className="public-footer">
        <p>The Brightpaths volunteer and intern portal. Separate from the public website.</p>
        <p>Brightpaths · 1450 Barnett Shoals Road, Athens, GA · 706.546.9713</p>
      </footer>
    </>
  );
}
