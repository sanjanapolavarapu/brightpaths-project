import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { ApplyForm } from "@/components/forms";
import { listTags } from "@/lib/data";
import { getSite } from "@/lib/site";

export const metadata = { title: "Apply" };

export default async function ApplyPage() {
  const tags = await listTags();
  const site = await getSite();
  return (
    <>
      <PublicHeader>
        <Link href="/login">Sign in</Link>
      </PublicHeader>
      <main className="public-main apply-page" id="content">
        <div className="page-head">
          <div>
            <h1>{site.apply_title}</h1>
          </div>
        </div>
        <section className="card narrow">
          <ApplyForm tags={tags} />
        </section>
      </main>
    </>
  );
}
