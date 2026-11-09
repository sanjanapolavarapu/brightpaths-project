"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSiteAction } from "@/lib/actions/upkeep";
import { isLongSiteField, SITE_GROUPS, SITE_LABELS, SITE_LIMITS, type SiteContent, type SiteKey } from "@/lib/site-copy";

function SaveWebsite() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save website"}
    </button>
  );
}

export function SiteForm({ site }: { site: SiteContent }) {
  const [state, action] = useActionState(saveSiteAction, { error: "" });
  return (
    <form className="stack site-form" action={action}>
      {state.error ? <p className="banner bad">{state.error}</p> : null}
      {SITE_GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend>{group.title}</legend>
          {group.note ? <p className="muted">{group.note}</p> : null}
          {group.keys.map((key) => (
            <SiteField key={key} name={key} value={site[key]} />
          ))}
        </fieldset>
      ))}
      <SaveWebsite />
    </form>
  );
}

function SiteField({ name, value }: { name: SiteKey; value: string }) {
  return (
    <label className="field">
      <span>{SITE_LABELS[name]}</span>
      {isLongSiteField(name) ? (
        <textarea className="short" name={name} required maxLength={SITE_LIMITS[name]} defaultValue={value} />
      ) : (
        <input name={name} required maxLength={SITE_LIMITS[name]} defaultValue={value} />
      )}
    </label>
  );
}
