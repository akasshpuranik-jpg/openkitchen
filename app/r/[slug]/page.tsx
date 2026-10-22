import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKitchenToday, getLast7Days, getRestaurantBySlug, getSpotsToday } from "@/lib/kitchen";
import { DinerSkeleton } from "../../_components/skeletons";
import { DinerView } from "./diner-view";
import { LiveRefresh } from "./live-refresh";
import { ShareButton } from "./share-button";

export default function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <Link href="/kitchens" className="motion-link whitespace-nowrap py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Back to all kitchens
        </Link>
        <ShareButton />
      </div>
      <Suspense fallback={<DinerSkeleton />}>
        <DinerPage params={params} />
      </Suspense>
      <LiveRefresh />
    </main>
  );
}

// Read per request, never cached: a refresh shows uploads from seconds ago, and the
// missed-spot banner is computed against today's date in India time at page load.
async function DinerPage({ params }: Pick<PageProps<"/r/[slug]">, "params">) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const [spots, days] = await Promise.all([getSpotsToday(restaurant.id), getLast7Days(restaurant.id)]);
  return <DinerView restaurant={restaurant} todayLabel={formatKitchenToday()} spots={spots} days={days} />;
}
