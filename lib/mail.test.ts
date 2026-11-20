import assert from "node:assert/strict";
import test from "node:test";
import { announcementText, mailboxDraft, mailProblem } from "./mail.ts";

test("practice and invalid addresses are not treated as real inboxes", () => {
  assert.equal(mailProblem("maya@brightpaths.test"), "practice");
  assert.equal(mailProblem("person@example.com"), "practice");
  assert.equal(mailProblem("not-an-email"), "invalid");
  assert.equal(mailProblem("volunteer@brightpaths.org"), null);
});

test("a short recipient list opens with the addresses hidden in BCC", () => {
  const draft = mailboxDraft({
    subject: "Saturday still needs help",
    body: "One more person can take this shift.",
    emails: ["maya@brightpaths.org", "not-an-email", "maya@brightpaths.org"],
  });
  assert.deepEqual(draft.emails, ["maya@brightpaths.org"]);
  assert.equal(draft.needsBccPaste, false);
  assert.match(draft.href, /^mailto:\?bcc=maya%40brightpaths\.org/);
  assert.match(draft.text, /Brightpaths volunteer portal\.$/);
});

test("announcement email greets the person and points back to the portal", () => {
  const text = announcementText("Maya Chen", "Saturday still needs one more person.");
  assert.match(text, /^Hi Maya,\n\nSaturday still needs one more person\./);
  assert.match(text, /Brightpaths volunteer portal\.$/);
});
