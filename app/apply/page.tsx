import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { ApplyForm } from "@/components/forms";
import { listTags } from "@/lib/data";

export const metadata = { title: "Apply" };

export default function ApplyPage() {
  const tags = listTags();
  return (
    <>
      <PublicHeader>
        <Link href="/login">Sign in</Link>
      </PublicHeader>
      <main className="public-main apply-page" id="content">
        <div className="page-head">
          <div>
            <h1>Tell us how you&apos;d like to help</h1>
            <p>
              Come as an individual, a church, or another group, for one shift or an ongoing role. Staff will follow
              up. Choose a password you don&apos;t use anywhere else.
            </p>
          </div>
        </div>
        <section className="card narrow">
          <ApplyForm tags={tags} />
        </section>
        <p className="muted" style={{ marginTop: "1rem" }}>
          We keep your name, email, phone, a scrambled copy of your password, and your answers so staff can follow up.
          We don&apos;t ask for a Social Security number, birth date, or home address. Passwords are hashed. The rest
          lives in this portal&apos;s database. The ways to help match the{" "}
          <a href="https://brightpathsathens.org/get-involved/volunteer/">Brightpaths volunteer page</a>.
        </p>
      </main>
    </>
  );
}
