import "server-only";
import { db } from "@/lib/db";
import type { Finding } from "@/lib/photo-check";

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
