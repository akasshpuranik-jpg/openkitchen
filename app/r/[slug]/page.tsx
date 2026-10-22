import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type Restaurant = { name: string; area: string };

export default function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 px-4 py-10">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <RestaurantDetails params={params} />
      </Suspense>
    </main>
  );
}

// Read per request (not cached): the diner page must show what staff uploaded seconds ago.
async function RestaurantDetails({ params }: Pick<PageProps<"/r/[slug]">, "params">) {
  const { slug } = await params;
  // Never select upload_token on a public page.
  const rows = (await db()`SELECT name, area FROM restaurants WHERE slug = ${slug}`) as Restaurant[];
  const restaurant = rows[0];
  if (!restaurant) notFound();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{restaurant.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{restaurant.area}</p>
      <p className="mt-6 text-sm text-zinc-500">Today&apos;s kitchen photos will appear here.</p>
    </>
  );
}
