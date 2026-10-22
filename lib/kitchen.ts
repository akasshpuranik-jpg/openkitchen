import "server-only";
import { db } from "@/lib/db";

// A kitchen "day" is the calendar day in India time, matching the photos_one_per_spot_per_day index.
export const KITCHEN_TZ = "Asia/Kolkata";

export type Restaurant = { id: string; name: string; area: string; slug: string };

export type SpotToday = {
  spotId: string;
  key: string;
  label: string;
  checklist: string;
  photo: { id: string; blobUrl: string; capturedAt: string; note: string | null } | null;
};

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
           p.id AS photo_id, p.blob_url, p.captured_at, f.note
    FROM spots s
    LEFT JOIN photos p
      ON p.spot_id = s.id
     AND (p.captured_at AT TIME ZONE ${KITCHEN_TZ})::date = (now() AT TIME ZONE ${KITCHEN_TZ})::date
    LEFT JOIN LATERAL (
      SELECT note FROM findings WHERE photo_id = p.id ORDER BY created_at DESC LIMIT 1
    ) f ON true
    WHERE s.restaurant_id = ${restaurantId}
    ORDER BY array_position(ARRAY['prep_counter', 'stove', 'fridge', 'wash_area'], s.key)`;

  return rows.map((r) => ({
    spotId: r.spot_id,
    key: r.key,
    label: r.label,
    checklist: r.checklist,
    photo: r.photo_id
      ? { id: r.photo_id, blobUrl: r.blob_url, capturedAt: formatKitchenTime(r.captured_at), note: r.note }
      : null,
  }));
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
