"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { applyAction } from "@/lib/actions/applications";
import { logHoursAction, saveEventAction } from "@/lib/actions/events";
import { sendMessageAction } from "@/lib/actions/messages";
import type { Tag } from "@/lib/types";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function ApplyForm({ tags }: { tags: Tag[] }) {
  const [state, action] = useActionState(applyAction, { error: "" });
  return (
    <form className="stack" action={action}>
      {state.error ? <p className="banner bad">{state.error}</p> : null}
      <div className="form-grid">
        <label className="field">
          <span>First name</span>
          <input name="firstName" required autoComplete="given-name" />
        </label>
        <label className="field">
          <span>Last name</span>
          <input name="lastName" required autoComplete="family-name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" required autoComplete="new-password" minLength={8} />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input name="confirm" type="password" required autoComplete="new-password" minLength={8} />
        </label>
      </div>
      <fieldset>
        <legend>I&apos;d like to join as</legend>
        <div className="checks">
          <label className="check">
            <input type="radio" name="role" value="volunteer" defaultChecked /> Volunteer
          </label>
          <label className="check">
            <input type="radio" name="role" value="intern" /> Intern
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Are you a</legend>
        <div className="checks">
          <label className="check">
            <input type="radio" name="volunteerAs" value="individual" defaultChecked /> Individual
          </label>
          <label className="check">
            <input type="radio" name="volunteerAs" value="church_group" /> Church group
          </label>
          <label className="check">
            <input type="radio" name="volunteerAs" value="corporate_group" /> Corporate group
          </label>
          <label className="check">
            <input type="radio" name="volunteerAs" value="other" /> Other
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Would you like</legend>
        <div className="checks">
          <label className="check">
            <input type="radio" name="cadence" value="once" /> A one-time opportunity
          </label>
          <label className="check">
            <input type="radio" name="cadence" value="ongoing" defaultChecked /> An ongoing opportunity
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>How are you interested in helping?</legend>
        <p className="muted">A box marked background check needs that check before those shifts.</p>
        <div className="checks">
          {tags.map((tag) => (
            <label className="check" key={tag.id}>
              <input type="checkbox" name="tag" value={tag.id} /> {tag.name}
              {tag.requires_background ? " (background check)" : ""}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Another way you&apos;d like to help</span>
        <textarea className="short" name="otherHelp" placeholder="A skill or interest that isn't in the list" />
      </label>
      <label className="field">
        <span>When can you usually be here?</span>
        <textarea className="short" name="availability" required placeholder="Weekday mornings, Saturday afternoons, or weekends" />
        <p className="muted">Days and time of day.</p>
      </label>
      <label className="field">
        <span>Comments</span>
        <textarea className="short" name="why" />
      </label>
      <label className="field">
        <span>Anything you&apos;ve done that might help? Optional.</span>
        <textarea className="short" name="experience" />
      </label>
      <Submit>Send my application</Submit>
    </form>
  );
}

export function EventForm({
  tags,
  event,
}: {
  tags: Tag[];
  event?: {
    id: number;
    title: string;
    description: string;
    location: string;
    starts: string;
    ends: string;
    capacity: number;
    minimum_volunteers: number;
    hours_credit: number;
    required_background_check: number;
    status: string;
    tagIds: number[];
  };
}) {
  const [state, action] = useActionState(saveEventAction, { error: "" });
  return (
    <form className="stack" action={action}>
      {state.error ? <p className="banner bad">{state.error}</p> : null}
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <label className="field">
        <span>Title</span>
        <input name="title" required defaultValue={event?.title} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea name="description" required defaultValue={event?.description} />
      </label>
      <label className="field">
        <span>Location</span>
        <input name="location" required defaultValue={event?.location} />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Starts (Eastern time)</span>
          <input name="starts" type="datetime-local" required defaultValue={event?.starts} />
        </label>
        <label className="field">
          <span>Ends (Eastern time)</span>
          <input name="ends" type="datetime-local" required defaultValue={event?.ends} />
        </label>
        <label className="field">
          <span>Capacity</span>
          <input name="capacity" type="number" min={1} required defaultValue={event?.capacity ?? 6} />
        </label>
        <label className="field">
          <span>Minimum volunteers</span>
          <input name="minimum" type="number" min={1} required defaultValue={event?.minimum_volunteers ?? 2} />
        </label>
        <label className="field">
          <span>Hours credited</span>
          <input name="hours" type="number" min={0.25} step={0.25} required defaultValue={event?.hours_credit ?? 3} />
        </label>
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={event?.status ?? "open"}>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="background" value="1" defaultChecked={Boolean(event?.required_background_check)} />
        Require an approved background check
      </label>
      <p className="muted">
        A way to help marked as needing a background check always requires an approved one, even if this box is left
        off.
      </p>
      <fieldset>
        <legend>Required tags</legend>
        <div className="checks">
          {tags.map((tag) => (
            <label className="check" key={tag.id}>
              <input type="checkbox" name="tag" value={tag.id} defaultChecked={event?.tagIds.includes(tag.id)} /> {tag.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Submit>{event ? "Save event" : "Create event"}</Submit>
    </form>
  );
}

function SendAnnouncement({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={disabled || pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}

export function MessageComposer({
  filters,
  recipientCount,
  mailReady,
  fromEmail,
  subject,
  body,
}: {
  filters: { role: string; background: boolean; archived: boolean; tagIds: number[] };
  recipientCount: number;
  mailReady: boolean;
  fromEmail: string;
  subject?: string;
  body?: string;
}) {
  const [state, action] = useActionState(sendMessageAction, { error: "" });
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const people = `${recipientCount} ${recipientCount === 1 ? "person" : "people"}`;
  const sendLabel = channel === "email" ? (mailReady ? "Send to portal and email" : "Save, then email") : "Save in the portal";
  return (
    <form className="stack" action={action}>
      {state.error ? <p className="banner bad">{state.error}</p> : null}
      <input type="hidden" name="role" value={filters.role} />
      {filters.background ? <input type="hidden" name="background" value="approved" /> : null}
      {filters.archived ? <input type="hidden" name="archived" value="1" /> : null}
      {filters.tagIds.map((id) => (
        <input key={id} type="hidden" name="tag" value={id} />
      ))}
      <p>
        {people} will see this in the portal.
        {channel === "email" && mailReady ? ` Each one is also emailed from ${fromEmail}.` : null}
        {channel === "email" && !mailReady
          ? ` Then open the email and send it from ${fromEmail}.`
          : null}
        {channel === "sms" ? " Text stays in the portal. It is not sent to phones." : null}
      </p>
      <div className="checks">
        <label className="check">
          <input type="radio" name="channel" value="email" checked={channel === "email"} onChange={() => setChannel("email")} /> Email
        </label>
        <label className="check">
          <input type="radio" name="channel" value="sms" checked={channel === "sms"} onChange={() => setChannel("sms")} /> Portal only
        </label>
      </div>
      {channel === "email" ? (
        <label className="field">
          <span>Subject</span>
          <input name="subject" required maxLength={140} defaultValue={subject} />
        </label>
      ) : null}
      <label className="field">
        <span>{channel === "sms" ? "Note (320 characters or fewer)" : "Announcement"}</span>
        <textarea name="body" required maxLength={channel === "sms" ? 320 : 5000} defaultValue={body} />
      </label>
      <SendAnnouncement label={sendLabel} disabled={!recipientCount} />
    </form>
  );
}

export function RecordHoursForm({
  people,
  eventId,
  returnTo,
  servedOn,
  hours,
}: {
  people: { id: number; name: string; background_check: string }[];
  eventId: number;
  returnTo: string;
  servedOn: string;
  hours: number;
}) {
  const [userId, setUserId] = useState("");
  const person = people.find((item) => String(item.id) === userId);
  const missingCheck = Boolean(person && person.background_check !== "approved");
  return (
    <form className="filters" action={logHoursAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="eventId" value={eventId} />
      <label className="field">
        <span>Person</span>
        <select name="userId" required value={userId} onChange={(event) => setUserId(event.target.value)}>
          <option value="" disabled>
            Choose
          </option>
          {people.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {missingCheck ? (
        <p className="banner warn" role="status">
          This person has no background check. You can still record the hours.
        </p>
      ) : null}
      <label className="field">
        <span>Date</span>
        <input type="date" name="servedOn" required defaultValue={servedOn} />
      </label>
      <label className="field">
        <span>Hours</span>
        <input type="number" name="hours" min={0.25} step={0.25} required defaultValue={hours} />
      </label>
      <button className="btn" type="submit">
        Record hours
      </button>
    </form>
  );
}
