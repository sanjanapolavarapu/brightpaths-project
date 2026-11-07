import type { Tag } from "./types";

export const SITE_DEFAULTS = {
  eyebrow: "Athens families",
  headline: "Show up for a family. We'll handle the rest of the paperwork.",
  lede: "Help with First Steps bags, childcare, the Family Resource Closet, donation drives, or community events. Apply in a few minutes, or sign in to see the shifts already waiting.",
  steps_label: "From hello to a shift",
  step_1: "Share how you like to help, and when you can usually be here.",
  step_2: "Staff follow your application through interview and approval.",
  step_3: "Open the calendar and take a shift that fits.",
  step_4: "Hours add up here, ready to print when you need them.",
  feature_1_title: "A short form",
  feature_1_body: "Volunteer or intern. Staff see it as soon as you send it, and they'll take it from there.",
  feature_2_title: "Your interests",
  feature_2_body: "No formal experience is required.",
  feature_3_title: "A day that fits",
  feature_3_body: "Sign up for shifts you qualify for. Short ones show up before the week gets away.",
  feature_4_title: "Hours that stay",
  feature_4_body: "Every hour is kept. Print them for school, a job, or just to look back.",
  staff_title: "For staff",
  staff_body: "See new applications, who can help this week, and which days are still short.",
  volunteer_title: "For volunteers and interns",
  volunteer_body: "Follow your application, pick up a shift, and keep a running total of the time you've given.",
  apply_title: "Apply",
  apply_lede: "Volunteer or intern.",
} as const;

export type SiteKey = keyof typeof SITE_DEFAULTS;
export type SiteContent = Record<SiteKey, string>;

export const SITE_KEYS = Object.keys(SITE_DEFAULTS) as SiteKey[];

export const SITE_LIMITS: Record<SiteKey, number> = {
  eyebrow: 48,
  headline: 140,
  lede: 400,
  steps_label: 48,
  step_1: 200,
  step_2: 200,
  step_3: 200,
  step_4: 200,
  feature_1_title: 48,
  feature_1_body: 240,
  feature_2_title: 48,
  feature_2_body: 240,
  feature_3_title: 48,
  feature_3_body: 240,
  feature_4_title: 48,
  feature_4_body: 240,
  staff_title: 48,
  staff_body: 240,
  volunteer_title: 60,
  volunteer_body: 240,
  apply_title: 90,
  apply_lede: 400,
};

export const SITE_LABELS: Record<SiteKey, string> = {
  eyebrow: "Small label above the headline",
  headline: "Headline",
  lede: "Intro under the headline",
  steps_label: "Label on the blue box",
  step_1: "Step 1",
  step_2: "Step 2",
  step_3: "Step 3",
  step_4: "Step 4",
  feature_1_title: "Box 1 title",
  feature_1_body: "Box 1 text",
  feature_2_title: "Box 2 title",
  feature_2_body: "Box 2 extra sentence",
  feature_3_title: "Box 3 title",
  feature_3_body: "Box 3 text",
  feature_4_title: "Box 4 title",
  feature_4_body: "Box 4 text",
  staff_title: "Staff card title",
  staff_body: "Staff card text",
  volunteer_title: "Volunteer card title",
  volunteer_body: "Volunteer card text",
  apply_title: "Application page title",
  apply_lede: "Application page intro",
};

export const SITE_GROUPS: { title: string; note?: string; keys: SiteKey[] }[] = [
  {
    title: "Top of the homepage",
    keys: ["eyebrow", "headline", "lede"],
  },
  {
    title: "Blue box",
    keys: ["steps_label", "step_1", "step_2", "step_3", "step_4"],
  },
  {
    title: "The four boxes",
    note: "Box 2 also lists the ways to help from the section below. That list updates on its own.",
    keys: [
      "feature_1_title",
      "feature_1_body",
      "feature_2_title",
      "feature_2_body",
      "feature_3_title",
      "feature_3_body",
      "feature_4_title",
      "feature_4_body",
    ],
  },
  {
    title: "Who it's for",
    keys: ["staff_title", "staff_body", "volunteer_title", "volunteer_body"],
  },
  {
    title: "Application page",
    keys: ["apply_title"],
  },
];

const LONG_FIELDS = new Set<SiteKey>([
  "lede",
  "step_1",
  "step_2",
  "step_3",
  "step_4",
  "feature_1_body",
  "feature_2_body",
  "feature_3_body",
  "feature_4_body",
  "staff_body",
  "volunteer_body",
  "apply_lede",
]);

export function isLongSiteField(key: SiteKey) {
  return LONG_FIELDS.has(key);
}

const EDITABLE_KEYS = new Set(SITE_GROUPS.flatMap((group) => group.keys));

export function readSiteForm(formData: FormData): { site?: SiteContent; error?: string } {
  const site = { ...SITE_DEFAULTS } as SiteContent;
  for (const key of SITE_KEYS) {
    if (!EDITABLE_KEYS.has(key)) continue;
    const value = String(formData.get(key) ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!value) return { error: `Fill in “${SITE_LABELS[key]}”.` };
    if (value.length > SITE_LIMITS[key]) {
      return { error: `“${SITE_LABELS[key]}” needs to be ${SITE_LIMITS[key]} characters or fewer.` };
    }
    site[key] = value;
  }
  return { site };
}

export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function interestsCopy(tags: Tag[]) {
  const names = tags.map((tag) => tag.name);
  const checked = tags.filter((tag) => tag.requires_background).map((tag) => tag.name);
  const list = names.length ? `${joinNames(names)}.` : "";
  let check = "";
  if (checked.length === 1) check = `${checked[0]} includes a background check.`;
  else if (checked.length > 1) check = `${joinNames(checked)} include a background check.`;
  return [list, check].filter(Boolean).join(" ");
}
