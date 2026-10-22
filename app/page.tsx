import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getKitchenList } from "@/lib/kitchen";
import { delay } from "@/lib/motion";
import { KitchenRows } from "./_components/kitchen-rows";
import { StepsReveal } from "./_components/steps-reveal";

const STEPS = [
  { title: "Staff photograph 4 set spots", body: "Every day, kitchen staff photograph the prep counter, stove, fridge and wash area." },
  { title: "Claude checks each photo", body: "Each photo is checked against that spot's hygiene checklist and gets a short note." },
  { title: "You see it before ordering", body: "Open the restaurant's page to see today's photos, times and notes before you order." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 py-10 sm:py-16">
      {/* Hero sequence: headline, then subline 100ms later, then the buttons. */}
      <section className="flex flex-col gap-4">
        <h1 className="motion-enter text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          See today&apos;s kitchen before you order
        </h1>
        <p style={delay(100)} className="motion-enter max-w-xl text-zinc-600 dark:text-zinc-400">
          Restaurants post time-stamped photos of their kitchen every day, so you can check it before you order on
          Zomato or Swiggy.
        </p>
        <div style={delay(200)} className="motion-enter mt-2 flex flex-wrap gap-3">
          <Link
            href="/kitchens"
            className="motion-lift inline-flex h-11 items-center rounded-xl bg-zinc-900 px-5 font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Browse kitchens
          </Link>
          <Link
            href="#how-it-works"
            className="motion-lift inline-flex h-11 items-center rounded-xl border border-zinc-300 px-5 font-medium dark:border-zinc-700"
          >
            How it works
          </Link>
        </div>
      </section>

      <section id="how-it-works" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-lg font-semibold">How it works</h2>
        <StepsReveal steps={STEPS} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Kitchens today</h2>
          <Link href="/kitchens" className="motion-link text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
            Search kitchens
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading kitchens…</p>}>
          <TodayList />
        </Suspense>
      </section>
    </main>
  );
}

// Read per request, not at build: kitchens are seeded after deploy and post through the day.
async function TodayList() {
  await connection();
  return <KitchenRows kitchens={await getKitchenList()} emptyText="No kitchens listed yet." />;
}
