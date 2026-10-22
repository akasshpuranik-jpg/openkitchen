import { del, put } from "@vercel/blob";
import sharp from "sharp";
import { db } from "@/lib/db";
import { KITCHEN_TZ, formatKitchenTime, getRestaurantByUploadToken } from "@/lib/kitchen";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request body limit
const MAX_EDGE_PX = 1600;

export type UploadResponse =
  | { ok: true; photoId: string; blobUrl: string; capturedAt: string }
  | { ok: false; error: string };

function fail(status: number, error: string) {
  return Response.json({ ok: false, error } satisfies UploadResponse, { status });
}

// Any client-sent time or metadata is ignored: captured_at is set by the DB trigger,
// and the image is re-encoded here, which drops EXIF (time, GPS, device).
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const spotId = form?.get("spotId");
  const file = form?.get("photo");
  if (typeof token !== "string" || typeof spotId !== "string" || !(file instanceof File)) {
    return fail(400, "Missing token, spot or photo.");
  }

  const restaurant = await getRestaurantByUploadToken(token);
  if (!restaurant) return fail(404, "Upload link not found.");

  const spots = await db()`
    SELECT key FROM spots WHERE id = ${spotId}::uuid AND restaurant_id = ${restaurant.id}`.catch(() => []);
  const spot = spots[0] as { key: string } | undefined;
  if (!spot) return fail(404, "Spot not found.");

  // Fast path for the UI; the unique index below is the real guard.
  const existing = await db()`
    SELECT 1 FROM photos
    WHERE spot_id = ${spotId}
      AND (captured_at AT TIME ZONE ${KITCHEN_TZ})::date = (now() AT TIME ZONE ${KITCHEN_TZ})::date`;
  if (existing.length > 0) return fail(409, "This spot already has a photo today.");

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return fail(413, "Photo is empty or too large.");

  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return fail(415, "That file isn't a readable image.");
  }

  const blob = await put(`kitchens/${restaurant.id}/${spot.key}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });

  try {
    const [photo] = await db()`
      INSERT INTO photos (restaurant_id, spot_id, blob_url)
      VALUES (${restaurant.id}, ${spotId}, ${blob.url})
      RETURNING id, captured_at`;
    return Response.json({
      ok: true,
      photoId: photo.id,
      blobUrl: blob.url,
      capturedAt: formatKitchenTime(photo.captured_at),
    } satisfies UploadResponse);
  } catch (err) {
    // No row points at this blob, so removing it keeps storage tidy; photo rows are never touched.
    await del(blob.url).catch(() => {});
    if ((err as { code?: string }).code === "23505") return fail(409, "This spot already has a photo today.");
    throw err;
  }
}
