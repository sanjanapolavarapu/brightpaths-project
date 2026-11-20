export type DeliveryStatus = "sent" | "failed" | "skipped";

export type DeliveryResult = {
  status: DeliveryStatus;
  error: string;
};

const PRACTICE_HOSTS = new Set(["localhost", "example.com", "example.net", "example.org"]);
const DEFAULT_FROM = "Brightpaths <csears@pcaathens.org>";
const DEFAULT_REPLY = "csears@pcaathens.org";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPracticeHost(domain: string) {
  const host = domain.toLowerCase();
  return (
    PRACTICE_HOSTS.has(host) ||
    host.endsWith(".test") ||
    host.endsWith(".example") ||
    host.endsWith(".invalid") ||
    host.endsWith(".localhost")
  );
}

export function mailConfigured() {
  return fromAddress() !== null;
}

export function announcementSender() {
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const named = from.match(/<([^>]+)>/);
  return (named?.[1] || from).trim();
}

const MAILTO_LIMIT = 1800;

export function groupAnnouncementText(body: string) {
  return `${body.trim()}\n\nThis note is also in your Brightpaths volunteer portal.`;
}

export function mailboxDraft(input: { subject: string; body: string; emails: string[] }) {
  const emails = [...new Set(input.emails.map((email) => email.trim()).filter((email) => isEmail(email)))];
  const subject = input.subject.replace(/[\r\n]+/g, " ").slice(0, 140);
  const text = groupAnnouncementText(input.body);
  const withBcc = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const subjectOnly = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const needsBccPaste = withBcc.length > MAILTO_LIMIT;
  return {
    emails,
    subject,
    text,
    href: needsBccPaste ? subjectOnly : withBcc,
    needsBccPaste,
  };
}

export function announcementText(name: string, body: string) {
  const first = name.trim().split(/\s+/)[0];
  const hello = first ? `Hi ${first},\n\n` : "";
  return `${hello}${body.trim()}\n\nThis note is also in your Brightpaths volunteer portal.`;
}

export function mailProblem(email: string): "invalid" | "practice" | null {
  const trimmed = email.trim();
  if (!isEmail(trimmed)) return "invalid";
  const domain = trimmed.split("@")[1] ?? "";
  if (isPracticeHost(domain)) return "practice";
  return null;
}

function fromAddress() {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  if (!key || !from.includes("@") || /[\r\n]/.test(from)) return null;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY;
  return {
    key,
    from,
    replyTo: replyTo && isEmail(replyTo) && !/[\r\n]/.test(replyTo) ? replyTo : "",
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function staffError(status: number, payload: string) {
  if (status === 401 || status === 403) return "The email service rejected the API key.";
  if (status === 429) return "The email service is busy. Try again later.";
  try {
    const parsed = JSON.parse(payload) as { message?: unknown };
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (message && message.length <= 160 && !/key|bearer|token/i.test(message)) return message;
  } catch {
    // The provider did not return a short message.
  }
  return "The email service could not send this.";
}

export async function sendAnnouncementEmail(input: {
  to: string;
  name: string;
  subject: string;
  body: string;
}): Promise<DeliveryResult> {
  const problem = mailProblem(input.to);
  if (problem === "invalid") return { status: "failed", error: "That email address is not valid." };
  if (problem === "practice") return { status: "skipped", error: "Practice address, so no email was sent." };

  const settings = fromAddress();
  if (!settings) return { status: "skipped", error: "Email is not set up on this site." };

  const text = announcementText(input.name, input.body);
  const subject = input.subject.replace(/[\r\n]+/g, " ").slice(0, 140);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: settings.from,
        to: [input.to.trim()],
        subject,
        text,
        html: `<div style="font-family: sans-serif; font-size: 16px; line-height: 1.5; color: #1c2b33;">${escapeHtml(text).replaceAll("\n", "<br>")}</div>`,
        ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const payload = await response.text();
      return { status: "failed", error: staffError(response.status, payload) };
    }
    return { status: "sent", error: "" };
  } catch {
    return { status: "failed", error: "The email service could not be reached." };
  }
}

export async function sendAnnouncementEmails<T extends { email: string; name: string }>(
  people: T[],
  message: { subject: string; body: string },
) {
  const results: Array<T & DeliveryResult> = new Array(people.length);
  let next = 0;
  const worker = async () => {
    while (next < people.length) {
      const index = next;
      next += 1;
      const person = people[index];
      const delivery = await sendAnnouncementEmail({
        to: person.email,
        name: person.name,
        subject: message.subject,
        body: message.body,
      });
      results[index] = { ...person, ...delivery };
    }
  };
  const workers = Math.min(4, people.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
