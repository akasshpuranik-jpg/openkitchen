import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For restaurants · OpenKitchen",
  description: "Show diners your kitchen every day with four time-stamped photos.",
};

const ROUTINE = [
  { spot: "Prep counter", what: "Surfaces wiped, food covered, raw and cooked kept apart." },
  { spot: "Stove", what: "Burners, hood and wall free of grease buildup." },
  { spot: "Fridge", what: "Containers covered, no spills or spoilage." },
  { spot: "Wash area", what: "Sink clear, soap out, no standing water." },
];

// Set CONTACT_EMAIL in Vercel to publish an address; the page never invents one.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

export default function ForRestaurantsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">For restaurants</h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Diners can&apos;t see inside your kitchen before they order. OpenKitchen lets you show them, every day, in about
          five minutes.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">The daily routine</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Each morning, a staff member opens your kitchen&apos;s private upload link on their phone and photographs four
          set spots with the camera. That&apos;s it.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ROUTINE.map((r) => (
            <li key={r.spot} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <span className="block font-medium">{r.spot}</span>
              <span className="block text-sm text-zinc-600 dark:text-zinc-400">{r.what}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Each photo is checked by Claude, an AI model, against that spot&apos;s checklist. Within seconds your page shows
          the photo, the time it was taken and a short note — for example &ldquo;No visible issues&rdquo; or
          &ldquo;Uncovered container, top shelf&rdquo;, so you can fix it before service.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Why it builds trust</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Diners see your real kitchen today, not a rating or a stock photo.</li>
          <li>
            Photos can&apos;t be edited, replaced or deleted once posted, and the time comes from our server, not the
            phone — so a clean kitchen is believable.
          </li>
          <li>If a day is missed, your page says so. Posting every day is what earns trust.</li>
          <li>Notes describe only what&apos;s visible. A photo too dark or blurry to judge is marked unclear, never clean.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold">Get your kitchen listed</h2>
        {CONTACT_EMAIL ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("List my kitchen on OpenKitchen")}`}
              className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            with your restaurant&apos;s name and area, and we&apos;ll set up your private upload link.
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            We&apos;re onboarding kitchens one at a time. Contact details are coming soon.
          </p>
        )}
      </section>
    </main>
  );
}
