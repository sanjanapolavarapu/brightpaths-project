import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listTags } from "@/lib/data";
import { getSite, interestsCopy } from "@/lib/site";

export default async function HomePage() {
  const user = await getCurrentUser();
  const site = await getSite();
  const tags = await listTags();
  const features = [
    { n: "01", title: site.feature_1_title, body: site.feature_1_body },
    { n: "02", title: site.feature_2_title, body: site.feature_2_body, interests: true },
    { n: "03", title: site.feature_3_title, body: site.feature_3_body },
    { n: "04", title: site.feature_4_title, body: site.feature_4_body },
  ];
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
            <p className="eyebrow">{site.eyebrow}</p>
            <h1>{site.headline}</h1>
            <p className="lede">{site.lede}</p>
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
            <p className="eyebrow">{site.steps_label}</p>
            <ol>
              <li>{site.step_1}</li>
              <li>{site.step_2}</li>
              <li>{site.step_3}</li>
              <li>{site.step_4}</li>
            </ol>
          </aside>
        </section>
        <section className="feature-row">
          {features.map((feature) => (
            <article key={feature.n}>
              <p className="num">{feature.n}</p>
              <h2>{feature.title}</h2>
              {feature.interests ? <p>{interestsCopy(tags)}</p> : null}
              <p>{feature.body}</p>
            </article>
          ))}
        </section>
        <section className="audience">
          <article className="audience-staff">
            <h2>{site.staff_title}</h2>
            <p>{site.staff_body}</p>
          </article>
          <article className="audience-volunteer">
            <h2>{site.volunteer_title}</h2>
            <p>{site.volunteer_body}</p>
          </article>
        </section>
      </main>
    </>
  );
}
