import { getLatestFinding, getRestaurantByUploadToken, type FindingStatus } from "@/lib/kitchen";

export type FindingResponse =
  | { ok: true; note: string | null; status: FindingStatus | null }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the upload card while a photo shows "Checking…". note is null until the check is saved.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token") ?? "";
  const photoId = params.get("photoId") ?? "";

  const restaurant = await getRestaurantByUploadToken(token);
  if (!restaurant) {
    return Response.json({ ok: false, error: "Upload link not found." } satisfies FindingResponse, { status: 404 });
  }
  const finding = UUID.test(photoId) ? await getLatestFinding(restaurant.id, photoId) : null;
  return Response.json(
    { ok: true, note: finding?.note ?? null, status: finding?.status ?? null } satisfies FindingResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}
