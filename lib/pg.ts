import postgres from "postgres";

type Client = postgres.Sql;

export function toPg(query: string) {
  let index = 0;
  let text = query.replace(/\?/g, () => `$${++index}`);
  text = text.replace(
    /GROUP_CONCAT\s*\(\s*([^,]+?)\s*,\s*'([^']*)'\s*\)/gi,
    "string_agg(($1)::text, '$2')",
  );
  if (/insert\s+or\s+ignore/i.test(text)) {
    text = text.replace(/insert\s+or\s+ignore/i, "INSERT");
    if (!/\bon\s+conflict\b/i.test(text)) text += " ON CONFLICT DO NOTHING";
  }
  text = text.replace(/\bLIKE\b/g, "ILIKE");
  return text;
}

function pieces(query: string) {
  return query
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const NO_ID = /^\s*insert\s+into\s+(user_tags|event_tags|message_recipients|site_settings)\b/i;

export class Db {
  constructor(private client: Client) {}

  prepare(query: string) {
    const text = toPg(query);
    return {
      run: async (...params: unknown[]) => {
        let statement = text;
        if (/^\s*insert\b/i.test(statement) && !NO_ID.test(statement) && !/\breturning\b/i.test(statement)) {
          statement += " RETURNING id";
        }
        const rows = await this.client.unsafe(statement, params as never[]);
        const first = rows[0] as { id?: number } | undefined;
        return { lastInsertRowid: first?.id ? Number(first.id) : 0 };
      },
      get: async (...params: unknown[]) => {
        const rows = await this.client.unsafe(text, params as never[]);
        return rows[0] as Record<string, unknown> | undefined;
      },
      all: async (...params: unknown[]) => {
        const rows = await this.client.unsafe(text, params as never[]);
        return [...rows] as Record<string, unknown>[];
      },
    };
  }

  async exec(query: string) {
    for (const part of pieces(query)) {
      if (/^pragma\b/i.test(part)) continue;
      await this.client.unsafe(toPg(part));
    }
  }
}

export function openPool(url: string) {
  return postgres(url, {
    ssl: "require",
    max: 3,
    prepare: false,
    connect_timeout: 20,
    onnotice: () => {},
    types: {
      int8: {
        to: 20,
        from: [20],
        serialize: (value: number) => String(value),
        parse: (value: string) => Number(value),
      },
      numeric: {
        to: 1700,
        from: [1700],
        serialize: (value: number) => String(value),
        parse: (value: string) => Number(value),
      },
    },
  });
}
