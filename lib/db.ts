import fs from "node:fs";
import path from "node:path";

// One tiny query interface over two drivers:
// - DATABASE_URL set  -> Postgres (Neon, Supabase, RDS...) via `postgres`
// - not set           -> embedded PGlite in ./.data/pglite, for local dev and demos
type Row = Record<string, unknown>;
type Driver = { query: <T extends Row = Row>(sql: string, params?: unknown[]) => Promise<T[]> };

const g = globalThis as unknown as { __nirakarDb?: Promise<Driver> };

async function connect(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  let driver: Driver;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 5, prepare: false });
    driver = { query: async (text, params = []) => (await sql.unsafe(text, params as never[])) as never };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    const lite = new PGlite(dir);
    driver = { query: async (text, params = []) => (await lite.query(text, params)).rows as never };
  }
  const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  for (const stmt of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await driver.query(stmt);
  }
  return driver;
}

function db(): Promise<Driver> {
  if (!g.__nirakarDb) g.__nirakarDb = connect();
  return g.__nirakarDb;
}

export async function query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(sql, params);
}

export async function one<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}
