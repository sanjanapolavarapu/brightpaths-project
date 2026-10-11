import { EventForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { listTags } from "@/lib/data";

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="stack" id="content">
      <PageHeader title="New event" lede="Give the shift a name, how many people it needs, and who it's for." />
      <section className="card">
        <EventForm tags={listTags()} />
      </section>
    </div>
  );
}
