"use client";

import { useState } from "react";
import { mailboxDraft, mailProblem } from "@/lib/mail";

export function MailboxSend({
  fromEmail,
  subject,
  body,
  emails,
}: {
  fromEmail: string;
  subject: string;
  body: string;
  emails: string[];
}) {
  const draft = mailboxDraft({ subject, body, emails });
  const practice = draft.emails.filter((email) => mailProblem(email) === "practice").length;
  const [copied, setCopied] = useState(false);

  async function copyAddresses() {
    await navigator.clipboard.writeText(draft.emails.join(", "));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="card stack">
      <h2>Send the email</h2>
      <p>
        This note is already in the portal. Open it in your mail and send it from {fromEmail}. The addresses go in BCC,
        so people do not see each other.
      </p>
      {draft.needsBccPaste ? (
        <p className="muted">This list is too long for one link. The addresses are copied when you open the email. Paste them into BCC.</p>
      ) : null}
      {practice ? (
        <p className="muted">
          {practice === 1 ? "1 address ends" : `${practice} addresses end`} in .test, so those copies will not arrive in a real inbox.
        </p>
      ) : null}
      <div className="filters">
        <a
          className="btn"
          href={draft.href}
          onClick={() => {
            if (draft.needsBccPaste) void copyAddresses();
          }}
        >
          Open email
        </a>
        <button className="btn-ghost" type="button" onClick={() => void copyAddresses()}>
          {copied ? "Addresses copied" : "Copy addresses"}
        </button>
      </div>
    </section>
  );
}
