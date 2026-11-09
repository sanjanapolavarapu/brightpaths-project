import postgres from "postgres";

type Client = postgres.Sql;

function pieces(query: string) {
  return query
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

// Runs the SQL it is given. Placeholders are $1, $2, and so on.
// An insert that needs the new id includes RETURNING id.
export class Db {
  constructor(private client: Client) {}

  prepare(query: string) {
    return {
      run: async (...params: unknown[]) => {
        const rows = await this.client.unsafe(query, params as never[]);
        const first = rows[0] as { id?: number } | undefined;
        return { lastInsertRowid: first?.id ? Number(first.id) : 0 };
      },
      get: async (...params: unknown[]) => {
        const rows = await this.client.unsafe(query, params as never[]);
        return rows[0] as Record<string, unknown> | undefined;
      },
      all: async (...params: unknown[]) => {
        const rows = await this.client.unsafe(query, params as never[]);
        return [...rows] as Record<string, unknown>[];
      },
    };
  }

  async exec(query: string) {
    for (const part of pieces(query)) {
      await this.client.unsafe(part);
    }
  }
}

export function openPool(url: string) {
  // One connection per server, closed when idle. The hosted site shares a small pool.
  return postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    idle_timeout: 20,
    prepare: false,
    fetch_types: false,
    connect_timeout: 10,
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
