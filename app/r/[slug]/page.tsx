import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatKitchenToday, getLast7Days, getRestaurantBySlug, getSpotsToday } from "@/lib/kitchen";
import { DinerView } from "./diner-view";

export default function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-zinc-500">Loading today&apos;s kitchen…</p>}>
        <DinerPage params={params} />
      </Suspense>
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
