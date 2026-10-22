import Link from "next/link";
import type { KitchenSummary } from "@/lib/kitchen";

// One row per restaurant with today's progress. Used by the homepage and /kitchens.
export function KitchenRows({ kitchens, emptyText }: { kitchens: KitchenSummary[]; emptyText: string }) {
  if (kitchens.length === 0) {
    return <p className="rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
      {kitchens.map((k) => (
        <li key={k.slug}>
          <Link
            href={`/r/${k.slug}`}
            className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{k.name}</span>
              <span className="block truncate text-sm text-zinc-500">{k.area}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right sm:flex-row sm:items-center sm:gap-2">
              {k.issueSpotted && <Chip className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">Issue spotted</Chip>}
              <PostedChip posted={k.posted} total={k.total} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PostedChip({ posted, total }: { posted: number; total: number }) {
  if (posted === 0) {
    return <Chip className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">No photos today</Chip>;
  }
  const done = posted >= total;
  return (
    <Chip
      className={
        done
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }
    >
      {posted}/{total} posted
    </Chip>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
