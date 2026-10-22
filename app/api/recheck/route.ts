import { getRestaurantByUploadToken, getTodayPhotosToRecheck, saveFinding, type FindingStatus } from "@/lib/kitchen";
import { runPhotoCheck } from "@/lib/photo-check";

// 4 photos checked in parallel; each check is capped at 2 × 25 s.
export const maxDuration = 60;

export type RecheckResponse =
  | { ok: true; results: { photoId: string; status: FindingStatus; note: string }[] }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Re-runs the Claude check on today's photos whose check failed ("error") or never ran.
// Photos stay untouched (insert-only); each re-check adds a new findings row, and the
// latest row is what both pages show. Body: { token, photoId? } — no photoId = all failed today.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; photoId?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const photoId = typeof body?.photoId === "string" ? body.photoId : undefined;
  if (photoId !== undefined && !UUID.test(photoId)) {
    return Response.json({ ok: false, error: "Bad photo id." } satisfies RecheckResponse, { status: 400 });
  }

  const restaurant = await getRestaurantByUploadToken(token);
  if (!restaurant) {
    return Response.json({ ok: false, error: "Upload link not found." } satisfies RecheckResponse, { status: 404 });
  }

  const photos = await getTodayPhotosToRecheck(restaurant.id, photoId);
  const results = await Promise.all(
    photos.map(async (p) => {
      const res = await fetch(p.blob_url);
      const jpeg = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
      if (!jpeg) console.error(`recheck: couldn't fetch ${p.blob_url} (${res.status})`);
      const { finding } = jpeg
        ? await runPhotoCheck({ jpeg, spotLabel: p.label, checklist: p.checklist })
        : { finding: null };
      if (!finding) return { photoId: p.id, status: "error" as const, note: "Photo file couldn't be loaded" };
      await saveFinding(p.id, finding);
      return { photoId: p.id, status: finding.status, note: finding.note };
    }),
  );

  return Response.json({ ok: true, results } satisfies RecheckResponse, { headers: { "Cache-Control": "no-store" } });
}
