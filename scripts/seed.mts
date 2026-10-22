// Seeds the one real demo restaurant and its 4 spots. Safe to re-run.
// Run: npm run db:seed -- --name "Real Restaurant Name" --area "Begumpet, Hyderabad" [--slug real-restaurant]
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";

const url = process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL is not set. Run `vercel env pull .env.local` first.");

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    area: { type: "string" },
    slug: { type: "string" },
  },
});
if (!values.name || !values.area) {
  throw new Error('Usage: npm run db:seed -- --name "<real restaurant>" --area "<area, city>" [--slug <slug>]');
}

const slug =
  values.slug ??
  values.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SPOTS = [
  {
    key: "prep_counter",
    label: "Prep counter",
    checklist: "Surface wiped and dry; no food scraps or spills; raw and cooked food kept apart; cutting boards clean; no pests.",
  },
  {
    key: "stove",
    label: "Stove",
    checklist: "No grease buildup on burners, hood or wall; no burnt residue; area around the stove clear; no pests.",
  },
  {
    key: "fridge",
    label: "Fridge",
    checklist: "All containers covered; no spills or pooled liquid; no visible spoilage or mould; raw meat stored below cooked food.",
  },
  {
    key: "wash_area",
    label: "Wash area",
    checklist: "Sink free of piled dirty dishes; soap present; drain clear; no standing water on the floor; no pests.",
  },
] as const;

const sql = neon(url);

const [restaurant] = await sql`
  INSERT INTO restaurants (name, area, slug, upload_token)
  VALUES (${values.name}, ${values.area}, ${slug}, ${randomBytes(32).toString("base64url")})
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area
  RETURNING id, slug, upload_token`;

for (const spot of SPOTS) {
  await sql`
    INSERT INTO spots (restaurant_id, key, label, checklist)
    VALUES (${restaurant.id}, ${spot.key}, ${spot.label}, ${spot.checklist})
    ON CONFLICT (restaurant_id, key) DO UPDATE SET label = EXCLUDED.label, checklist = EXCLUDED.checklist`;
}

console.log(`Seeded ${values.name} with ${SPOTS.length} spots.`);
console.log(`Diner page:   /r/${restaurant.slug}`);
console.log(`Upload token: ${restaurant.upload_token}  (keep private; staff upload link uses this)`);
