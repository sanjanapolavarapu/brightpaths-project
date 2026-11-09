import { getDb } from "./db";
import { SITE_DEFAULTS, SITE_KEYS, type SiteContent } from "./site-copy";

export { interestsCopy } from "./site-copy";

export async function getSite(): Promise<SiteContent> {
  const db = await getDb();
  const rows = (await db.prepare("SELECT key, value FROM site_settings").all()) as { key: string; value: string }[];
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const site = { ...SITE_DEFAULTS } as SiteContent;
  for (const key of SITE_KEYS) {
    const value = stored.get(key);
    if (typeof value === "string" && value.trim()) site[key] = value;
  }
  return site;
}

export async function saveSite(values: SiteContent) {
  const db = await getDb();
  const statement = db.prepare(
    "INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
  );
  for (const key of SITE_KEYS) await statement.run(key, values[key]);
}
