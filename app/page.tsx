import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getKitchenList } from "@/lib/kitchen";
import { KitchenRows } from "./_components/kitchen-rows";

const STEPS = [
  { title: "Staff photograph 4 set spots", body: "Every day, kitchen staff photograph the prep counter, stove, fridge and wash area." },
  { title: "Claude checks each photo", body: "Each photo is checked against that spot's hygiene checklist and gets a short note." },
  { title: "You see it before ordering", body: "Open the restaurant's page to see today's photos, times and notes before you order." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-4 py-10 sm:py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          See today&apos;s kitchen before you order
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Restaurants post time-stamped photos of their kitchen every day, so you can check it before you order on
          Zomato or Swiggy.
        </p>
      </section>

      <section id="how-it-works" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500">Step {i + 1}</span>
              <span className="font-medium">{step.title}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">Kitchens today</h2>
          <Link href="/kitchens" className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
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
