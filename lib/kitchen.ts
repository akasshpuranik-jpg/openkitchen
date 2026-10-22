import "server-only";
import { db } from "@/lib/db";
import type { Finding } from "@/lib/photo-check";

// A kitchen "day" is the calendar day in India time, matching the photos_one_per_spot_per_day index.
export const KITCHEN_TZ = "Asia/Kolkata";

export type Restaurant = { id: string; name: string; area: string; slug: string };

export type FindingStatus = Finding["status"];

export type SpotToday = {
  spotId: string;
  key: string;
  label: string;
  checklist: string;
  photo: {
    id: string;
    blobUrl: string;
    capturedAt: string; // "22 Oct, 10:42 am"
    postedTime: string; // "10:42 AM"
    note: string | null; // null while the check is running
    status: FindingStatus | null;
  } | null;
};

// One spot on one day in the 7-day strip.
export type DayState = FindingStatus | "checking" | "missed";
export type DayRow = { date: string; isToday: boolean; spots: { key: string; label: string; state: DayState }[] };

const SPOT_ORDER = ["prep_counter", "stove", "fridge", "wash_area"];

export async function getRestaurantByUploadToken(token: string): Promise<Restaurant | null> {
  // Tokens are 43 chars of base64url; skip the query for anything else.
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
  const rows = await db()`
    SELECT id, name, area, slug FROM restaurants WHERE upload_token = ${token}`;
  return (rows[0] as Restaurant | undefined) ?? null;
}

// The 4 spots with today's photo (if any) and its latest finding note.
export async function getSpotsToday(restaurantId: string): Promise<SpotToday[]> {
  const rows = await db()`
    SELECT s.id AS spot_id, s.key, s.label, s.checklist,
           p.id AS photo_id, p.blob_url, p.captured_at, f.note, f.status
    FROM spots s
    LEFT JOIN photos p
      ON p.spot_id = s.id
     AND (p.captured_at AT TIME ZONE ${KITCHEN_TZ})::date = (now() AT TIME ZONE ${KITCHEN_TZ})::date
    LEFT JOIN LATERAL (
      SELECT note, status FROM findings WHERE photo_id = p.id ORDER BY created_at DESC LIMIT 1
    ) f ON true
    WHERE s.restaurant_id = ${restaurantId}
    ORDER BY array_position(${SPOT_ORDER}::text[], s.key)`;

  return rows.map((r) => ({
    spotId: r.spot_id,
    key: r.key,
    label: r.label,
    checklist: r.checklist,
    photo: r.photo_id
      ? {
          id: r.photo_id,
          blobUrl: r.blob_url,
          capturedAt: formatKitchenTime(r.captured_at),
          postedTime: formatPostedTime(r.captured_at),
          note: r.note,
          status: r.status,
        }
      : null,
  }));
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  // Never select upload_token for public pages.
  const rows = await db()`SELECT id, name, area, slug FROM restaurants WHERE slug = ${slug}`;
  return (rows[0] as Restaurant | undefined) ?? null;
}

// Today and the 6 days before it (India time), newest first, never earlier than the
// day the restaurant joined. Each spot is its latest finding status, "checking", or "missed".
export async function getLast7Days(restaurantId: string): Promise<DayRow[]> {
  const rows = await db()`
    WITH today AS (SELECT (now() AT TIME ZONE ${KITCHEN_TZ})::date AS d),
    days AS (
      SELECT (today.d - g)::date AS day, g = 0 AS is_today
      FROM today, generate_series(0, 6) AS g, restaurants r
      WHERE r.id = ${restaurantId}
        AND today.d - g >= (r.created_at AT TIME ZONE ${KITCHEN_TZ})::date
    )
    SELECT days.day::text AS day, days.is_today, s.key, s.label,
           p.id IS NOT NULL AS posted, f.status
    FROM days
    CROSS JOIN spots s
    LEFT JOIN photos p
      ON p.spot_id = s.id AND (p.captured_at AT TIME ZONE ${KITCHEN_TZ})::date = days.day
    LEFT JOIN LATERAL (
      SELECT status FROM findings WHERE photo_id = p.id ORDER BY created_at DESC LIMIT 1
    ) f ON true
    WHERE s.restaurant_id = ${restaurantId}
    ORDER BY days.day DESC, array_position(${SPOT_ORDER}::text[], s.key)`;

  const byDay = new Map<string, DayRow>();
  for (const r of rows) {
    const row: DayRow = byDay.get(r.day) ?? { date: r.day, isToday: r.is_today, spots: [] };
    const state: DayState = !r.posted ? "missed" : (r.status ?? "checking");
    row.spots.push({ key: r.key, label: r.label, state });
    byDay.set(r.day, row);
  }
  return [...byDay.values()];
}

export async function saveFinding(photoId: string, f: Finding) {
  await db()`
    INSERT INTO findings (photo_id, spot_match, status, issues, confidence, note, model)
    VALUES (${photoId}, ${f.spot_match}, ${f.status}, ${JSON.stringify(f.issues)}::jsonb,
            ${f.confidence.toFixed(2)}, ${f.note}, ${f.model})`;
}

// Latest finding note for a photo, scoped to the restaurant that owns the upload token.
export async function getFindingNote(restaurantId: string, photoId: string): Promise<string | null> {
  const rows = await db()`
    SELECT f.note FROM findings f
    JOIN photos p ON p.id = f.photo_id
    WHERE f.photo_id = ${photoId}::uuid AND p.restaurant_id = ${restaurantId}
    ORDER BY f.created_at DESC LIMIT 1`;
  return (rows[0]?.note as string | undefined) ?? null;
}

// Times are formatted on the server, in India time, so every viewer sees kitchen time.
export function formatPostedTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: KITCHEN_TZ, hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
}

// "Thursday, 22 October" for today in India time.
export function formatKitchenToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: KITCHEN_TZ, weekday: "long", day: "numeric", month: "long" }).format(now);
}

// "Thu 22 Oct" for a YYYY-MM-DD kitchen day.
export function formatKitchenDay(day: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: KITCHEN_TZ, weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${day}T12:00:00+05:30`),
  );
}

// Formatted on the server so the page and the API show the same string.
export function formatKitchenTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: KITCHEN_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
