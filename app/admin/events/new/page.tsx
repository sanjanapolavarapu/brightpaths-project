import { EventForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { listTags } from "@/lib/data";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  return (
    <div className="stack" id="content">
      <PageHeader title="New event" />
      <section className="card">
        <EventForm tags={await listTags()} />
      </section>
    </div>
  );
}
