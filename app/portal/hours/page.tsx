import Link from "next/link";
import { HoursTable, HoursToolbar, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listHours } from "@/lib/data";
import { dateRange, queryValue } from "@/lib/format";

export const metadata = { title: "Your hours" };

export default async function PortalHoursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const range = dateRange({
    range: queryValue(params.range),
    from: queryValue(params.from),
    to: queryValue(params.to),
  });
  const rows = (await listHours({ userId: user.id, from: range.from, to: range.to })).map((row) => ({
    ...row,
    person_name: undefined,
  }));
  const certificate = `/portal/certificate?range=${range.key}${range.key === "custom" ? `&from=${range.from}&to=${range.to}` : ""}`;

  return (
    <div className="stack" id="content">
      <PageHeader title="Hours" lede={range.label}>
        <Link className="btn" href={certificate}>
          Print my hours
        </Link>
      </PageHeader>
      <HoursToolbar path="/portal/hours" rangeKey={range.key} from={range.from} to={range.to} />
      <section className="card">
        <HoursTable rows={rows} />
      </section>
    </div>
  );
}
