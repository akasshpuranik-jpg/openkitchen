import { NextResponse, type NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

// Unknown upload links and restaurant pages get a real 404 status. Those pages stream
// (status fixed at 200), so the check has to happen here, before rendering starts.
export const config = {
  matcher: ["/upload/:token", "/r/:slug"],
};

export async function proxy(request: NextRequest) {
  const [, section, value = ""] = request.nextUrl.pathname.split("/");
  if (await exists(section, value)) return NextResponse.next();
  // No such route, so Next.js serves its not-found page with a 404 status.
  return NextResponse.rewrite(new URL("/not-found-404", request.url));
}

async function exists(section: string | undefined, value: string) {
  const url = process.env.POSTGRES_URL;
  if (!url) return false;
  const sql = neon(url);
  if (section === "upload" && /^[A-Za-z0-9_-]{32,128}$/.test(value)) {
    return (await sql`SELECT 1 FROM restaurants WHERE upload_token = ${value}`).length > 0;
  }
  if (section === "r" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return (await sql`SELECT 1 FROM restaurants WHERE slug = ${value}`).length > 0;
  }
  return false;
}
