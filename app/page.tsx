import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getDemoRestaurant } from "@/lib/kitchen";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-medium text-zinc-500">OpenKitchen</p>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        See a restaurant&apos;s kitchen, photographed today, before you order.
      </h1>
      <Suspense fallback={<div className="h-12" />}>
        <DemoLink />
      </Suspense>
    </main>
  );
}

// Read at request time, not build time: the restaurant is seeded after the first deploy.
async function DemoLink() {
  await connection();
  const demo = await getDemoRestaurant();
  if (!demo) return null;
  return (
    <Link
      href={`/r/${demo.slug}`}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-400 sm:w-auto dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
    >
      <span>
        <span className="block font-medium">See today&apos;s kitchen at {demo.name}</span>
        <span className="block text-sm text-zinc-500">{demo.area}</span>
      </span>
      <span aria-hidden className="text-zinc-400">
        →
      </span>
    </Link>
  );
}
