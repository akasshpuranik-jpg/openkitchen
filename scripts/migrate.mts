// Applies db/migrations/*.sql in filename order, each once, each in a transaction.
// Run: npm run db:migrate   (reads POSTGRES_URL from .env.local)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = WebSocket;

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL is not set. Run `vercel env pull .env.local` first.");

const dir = join(import.meta.dirname, "..", "db", "migrations");
const pool = new Pool({ connectionString: url });
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("migrations up to date");
} finally {
  client.release();
  await pool.end();
}
