// Issues a new private upload link (staff code) for a restaurant. The old link stops
// working immediately: the upload page, /staff and every API check the token in the DB.
// Run: npm run staff:rotate -- --slug empire-restaurant
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL is not set. Run `vercel env pull .env.local` first.");

const { values } = parseArgs({ options: { slug: { type: "string" } } });
if (!values.slug) throw new Error("Usage: npm run staff:rotate -- --slug <restaurant-slug>");

const sql = neon(url);
const token = randomBytes(32).toString("base64url");
const rows = await sql`
  UPDATE restaurants SET upload_token = ${token}
  WHERE slug = ${values.slug}
  RETURNING name, slug`;

if (rows.length === 0) throw new Error(`No restaurant with slug "${values.slug}".`);

console.log(`New staff link for ${rows[0].name}. The old link no longer works.`);
console.log(`Upload page: /upload/${token}`);
console.log(`Staff code:  ${token}  (keep private)`);
