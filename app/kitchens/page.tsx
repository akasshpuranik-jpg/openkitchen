import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getKitchenList } from "@/lib/kitchen";
import { KitchenSearch } from "./kitchen-search";

export const metadata: Metadata = {
  title: "Kitchens · OpenKitchen",
  description: "Every kitchen on OpenKitchen, with today's photo status.",
};

export default function KitchensPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kitchens</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Today&apos;s photo status for every kitchen on OpenKitchen.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading kitchens…</p>}>
        <AllKitchens />
      </Suspense>
    </main>
  );
}

// Read per request: today's status changes as staff post.
async function AllKitchens() {
  await connection();
  return <KitchenSearch kitchens={await getKitchenList()} />;
}
