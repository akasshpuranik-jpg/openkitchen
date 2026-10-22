import { isValidUploadToken } from "@/lib/kitchen";

export type StaffCodeResponse = { ok: true; path: string } | { ok: false; error: string };

// Checks a staff code (a restaurant's upload token) for /staff. Codes are 256-bit random,
// so a yes/no answer doesn't make them guessable.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  if (!(await isValidUploadToken(code))) {
    return Response.json({ ok: false, error: "Code not recognised" } satisfies StaffCodeResponse, { status: 404 });
  }
  return Response.json({ ok: true, path: `/upload/${code}` } satisfies StaffCodeResponse, {
    headers: { "Cache-Control": "no-store" },
  });
}
