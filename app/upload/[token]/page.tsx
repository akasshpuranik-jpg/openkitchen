import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatKitchenToday, getRestaurantByUploadToken, getSpotsToday } from "@/lib/kitchen";
import { SpotCards } from "./spot-cards";

// Staff page renders with its data in one go (no loading state). proxy.ts has already
// turned unknown tokens into a 404; notFound() below is the backstop.
export const instant = false;

export const metadata: Metadata = {
  title: "Upload kitchen photos · OpenKitchen",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UploadPage({ params }: PageProps<"/upload/[token]">) {
  const { token } = await params;
  const restaurant = await getRestaurantByUploadToken(token);
  if (!restaurant) notFound();
  const spots = await getSpotsToday(restaurant.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <header>
        {/* The date makes a page left open past midnight obvious; reloading starts the new day. */}
        <p className="text-sm text-zinc-500">Kitchen photos · {formatKitchenToday()}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{restaurant.area}</p>
      </header>
      <SpotCards token={token} spots={spots} />
    </main>
  );
}
