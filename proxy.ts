import { NextResponse, type NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

// Wrong upload links get a real 404 status. The page streams (status fixed at 200),
// so this check has to happen here, before rendering starts.
export const config = {
  matcher: "/upload/:token",
};

export async function proxy(request: NextRequest) {
  const token = request.nextUrl.pathname.split("/")[2] ?? "";
  if (/^[A-Za-z0-9_-]{32,128}$/.test(token) && process.env.POSTGRES_URL) {
    const sql = neon(process.env.POSTGRES_URL);
    const rows = await sql`SELECT 1 FROM restaurants WHERE upload_token = ${token}`;
    if (rows.length > 0) return NextResponse.next();
  }
  // No such route, so Next.js serves its not-found page with a 404 status.
  return NextResponse.rewrite(new URL("/upload-link-not-found", request.url));
}
