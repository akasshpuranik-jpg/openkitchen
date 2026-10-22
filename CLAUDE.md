# OpenKitchen — MVP

Restaurants post daily kitchen photos; diners in Hyderabad see a kitchen's actual hygiene before ordering on Zomato/Swiggy.
Source of truth for scope: `~/Desktop/OpenKitchen-MVP-Scope.pdf` (section 9).

## The one journey
Staff upload today's photos → Claude checks them → diner sees them on the restaurant page.
Anything that doesn't serve this journey is out of scope.

## IN — the only 3 features to build
1. **Staff upload** — private link per restaurant; 4 set spots (prep counter, stove, fridge, wash area); camera capture only; server timestamp; a photo can't be replaced or deleted.
2. **Claude photo check** — per photo, Claude vision returns structured JSON: spot match, visible issues (type, where, severity), confidence.
3. **Diner page** — today's photos with times and notes, a red banner when today has no photos, and a 7-day strip. Works on phone and desktop.

## Do not build
- Diner reports with a photo
- Owner dispute flow and moderator queue
- Logins and restaurant self-signup
- Follow-up "fixed" photos beside a flag
- Link/badge on Zomato/Swiggy listings; QR code at the restaurant
- 30-day hygiene trend score

## Stack
- Next.js (App Router, TypeScript, Tailwind), deployed on Vercel (every push to GitHub deploys)
- Vercel Blob for photo files
- Postgres (Neon via Vercel Marketplace) for data
- Anthropic API (Claude vision) for the photo check — the only AI step

## Hard rules
- **Photo rows are insert-only.** No UPDATE or DELETE on photo rows, in code or in routes. A new photo is a new row.
- **Timestamps come from the server only** (DB default / server clock). Never trust or accept a client- or EXIF-supplied time.
- **Low confidence or blurry → "unclear", never "clean".** When in doubt, the result is "unclear".
- **Diner-facing notes come from a fixed template** filled from Claude's structured fields (issue, where, severity, confidence) — never show free AI text to diners.
- **Missed day is a rule:** no photo for today = red banner. No AI involved.
- Claude judges photos only; everything diners must trust (time, storage, no-replace, banner) stays deterministic.

## Commands & layout
- `npm run dev` · `npm run db:migrate` · `npm run db:seed -- --name "<real name>" --area "<area>"` (both read `.env.local`)
- Schema changes = new file in `db/migrations/NNN_*.sql`; never edit an applied one. DB access via `db()` in `lib/db.ts`.
- Next.js 16 with Cache Components: see AGENTS.md; per-request DB reads go inside `<Suspense>`.
- Staff upload: `/upload/[token]` → `POST /api/upload` (sharp re-encode strips EXIF → public Blob → insert). Bad tokens 404 in `proxy.ts`.
- One photo per spot per India-time day, enforced by a unique index; the UI and API only pre-check it.
- 11:00 reminder (stretch, built): `GET /api/missing-today` with `Authorization: Bearer $REMINDER_SECRET`; n8n sends the WhatsApp/email.
- Photo check: `lib/photo-check.ts` (Claude call in `after()`, zod-validated, notes from fixed templates). Tune with `npm run check:photos` on `test-images/`.

## Data & access
- Exactly one seeded, real restaurant (no fake data). Seed it via a script/migration.
- No logins and no self-signup. Staff access is a private, unguessable per-restaurant upload link; the diner page is public.
