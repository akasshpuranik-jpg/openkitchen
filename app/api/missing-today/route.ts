import { createHash, timingSafeEqual } from "node:crypto";
import { getMissingToday } from "@/lib/kitchen";

// For the 11:00 IST reminder (n8n). Call with: Authorization: Bearer <REMINDER_SECRET>
// Returns, per restaurant, the spots with no photo yet today, plus a ready-to-send message.
// Never returns upload tokens: staff already have their link.
export async function GET(request: Request) {
  const secret = process.env.REMINDER_SECRET;
  if (!secret) return Response.json({ error: "Reminder endpoint is not configured." }, { status: 503 });
  if (!secretMatches(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { date, restaurants } = await getMissingToday();
  const origin = new URL(request.url).origin;
  const list = new Intl.ListFormat("en", { type: "conjunction" });

  const out = restaurants.map((r) => ({
    ...r,
    page_url: `${origin}/r/${r.slug}`,
    message:
      r.missing.length === 0
        ? null
        : `${r.name}: today's kitchen photos are missing for the ${list.format(r.missing.map((m) => m.label.toLowerCase()))}. Diners see a red banner until they're posted.`,
  }));

  return Response.json(
    {
      date,
      any_missing: out.some((r) => r.missing.length > 0),
      restaurants: out,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Constant-time comparison; hashing first makes both sides the same length.
function secretMatches(given: string, expected: string) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
