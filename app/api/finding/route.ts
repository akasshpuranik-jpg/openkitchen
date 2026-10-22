import { getFindingNote, getRestaurantByUploadToken } from "@/lib/kitchen";

export type FindingResponse = { ok: true; note: string | null } | { ok: false; error: string };

// Polled by the upload card while a photo shows "Checking…". note is null until the check is saved.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token") ?? "";
  const photoId = params.get("photoId") ?? "";

  const restaurant = await getRestaurantByUploadToken(token);
  if (!restaurant) {
    return Response.json({ ok: false, error: "Upload link not found." } satisfies FindingResponse, { status: 404 });
  }
  const note = await getFindingNote(restaurant.id, photoId).catch(() => null);
  return Response.json({ ok: true, note } satisfies FindingResponse, { headers: { "Cache-Control": "no-store" } });
}
