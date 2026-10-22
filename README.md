# OpenKitchen

See a restaurant's kitchen, photographed today, before you order.

## The problem

Food-delivery diners in Hyderabad find hygiene problems only after the food arrives — an insect mid-meal, then a
complaint that ends in a coupon or nothing. Before ordering they have ratings and discounts, and no way to see the
kitchen. OpenKitchen moves the check to before the order: the kitchen posts photos of four set spots every day, and
the diner sees them, time-stamped and checked, on the restaurant's page.

## How it works

One journey: **staff upload today's photos → Claude checks them → a diner sees them on the restaurant page.**

```
Input               Claude                 Logic                      Tools                  Output
─────               ──────                 ─────                      ─────                  ──────
Staff phone   →   Claude vision    →   zod validation         →   Vercel Blob (photo)  →   Diner page /r/[slug]
camera photo      (claude-sonnet-5-5)  + fixed rules:             Neon Postgres           · today's 4 photos
of one spot       per photo, against   · bad JSON / blurry /       (insert-only rows,      · "Posted 10:42 AM"
(4 set spots)     that spot's          confidence < 0.6           server timestamps)      · templated note + chip
                  checklist; returns     → "unclear"                                       · red banner for missed spots
                  JSON only: spot      · wrong spot → "unclear"                            · last-7-days strip
                  match, issues,       · note built from a
                  confidence, blurry     fixed template
```

1. **Input — `/upload/[token]`.** A private link per restaurant, no login. Staff tap "Take photo" on each spot card
   (camera only). The browser shrinks the photo to 1600 px; the server re-encodes it (dropping EXIF time, GPS and
   device data), stores it in Vercel Blob and inserts a `photos` row. The timestamp is the database clock.
2. **Claude.** After the response is sent, the server sends the photo, the spot name and its checklist to Claude.
   Claude returns structured JSON only: `spot_match`, `issues[{type, where, severity}]`, `confidence`, `blurry`.
   Claude is the only judgement step.
3. **Logic.** The JSON is validated with zod. Anything unparseable, blurry or below 0.6 confidence is **"unclear" —
   never "clean"**. A wrong-spot photo is "unclear" with "Photo doesn't match the fridge spot". Otherwise the note is
   built from a fixed template: "No visible issues", or up to 3 issues as "[type], [where]". Issue types come from a
   fixed list, so Claude's own wording never reaches diners. API errors and timeouts are saved as "unclear" and logged.
4. **Tools.** Vercel Blob holds the photos. Neon Postgres holds `restaurants`, `spots`, `photos` and `findings`.
   Triggers make `photos` insert-only (no UPDATE, DELETE or TRUNCATE) and overwrite any timestamp with `now()`.
   A unique index allows one photo per spot per India-time day.
5. **Output — `/r/[slug]`.** Read fresh on every request: today's photos with server times, notes and status chips
   (green ok, amber issues, grey unclear), a red banner naming any spot not yet posted today (India time), and a
   last-7-days strip. The upload card polls until the note arrives, so staff see the result within seconds.

Everything diners must trust — timestamps, no-replace, the missed-day banner — is plain code, not AI.

## Deliberately out of scope

Not built, by design, for this MVP:

- Logins and restaurant self-signup — there is one seeded, real restaurant
- Diner reports with a photo
- Owner dispute flow and moderator queue
- 11:00 reminder to staff (n8n, WhatsApp or email)
- Follow-up "fixed" photos beside a flag
- Link or badge on Zomato/Swiggy listings; QR code at the restaurant
- 30-day hygiene trend score

## Setup

Needs Node 22.18+ (the scripts run TypeScript directly), a GitHub account, a Vercel account and an Anthropic API key.

1. **Push to GitHub.** Create an empty repo, then:
   ```bash
   git remote add origin https://github.com/<you>/openkitchen.git
   git push -u origin main
   ```
2. **Import to Vercel.** vercel.com/new → import the repo → Deploy (defaults are fine).
3. **Add storage** in the Vercel project's **Storage** tab, connecting each to all environments:
   - **Neon** (Postgres) via the Marketplace — adds `POSTGRES_URL`.
   - **Blob** — choose **Public** access — adds `BLOB_READ_WRITE_TOKEN`.
4. **Add `ANTHROPIC_API_KEY`** under Settings → Environment Variables, then redeploy.
5. **Pull env vars and set up the database** locally:
   ```bash
   npm install
   npx vercel link
   npx vercel env pull .env.local
   npm run db:migrate
   npm run db:seed -- --name "<real restaurant name>" --area "<area>, Hyderabad"
   ```
   The seed prints the diner page path and the private upload token. Re-running it is safe and keeps the token.
6. **Run it:** `npm run dev`, then open `/` (links to the restaurant page) and `/upload/<token>` on a phone.

To tune the Claude prompt without uploading, put photos named after their spot (`fridge-1.jpg`, `stove.png`, …) in
`test-images/` and run `npm run check:photos`. It prints Claude's raw JSON and the note the app would save.

Preview deployments are behind Vercel login by default; sign in on the phone, or relax Deployment Protection while
demoing.

## Known edge cases

- **Midnight (India time).** "Today" is the calendar day in Asia/Kolkata everywhere: the unique index, the API check,
  the banner and the 7-day strip. An upload page left open past midnight still shows yesterday's cards; it shows the
  date in its header, and a reload starts the new day.
- **Today counts as missed until posted.** In the morning the banner and today's row show spots as missed until staff
  post them.
- **Slow or failing Claude API.** Each check times out after 25 s with one retry, then is saved as "unclear", inside the
  upload function's 60 s limit. If the function dies before saving, that photo stays "Checking" on both pages.
- **Large photos.** The browser shrinks photos before upload; the server rejects bodies over 4 MB (Vercel's limit is
  4.5 MB) and anything it can't decode, with a clear message on the card.
- **Two uploads for one spot at once.** The unique index lets one in; the other gets "already has a photo today" and
  its stored file is removed.
