import Link from "next/link";
import type { Ref } from "react";
import type { KitchenSummary } from "@/lib/kitchen";
import { stagger } from "@/lib/motion";

// Each row's chips fade in this long after the row itself starts.
const CHIP_AFTER_ROW_MS = 150;

// One card per restaurant with today's progress. Used by the homepage and /kitchens.
// /kitchens passes `leaving` (rows fading out of a search) and turns off the load-time
// stagger once the visitor starts typing (`staggerIn={false}`).
export function KitchenRows({
  kitchens,
  emptyText,
  leaving,
  staggerIn = true,
  listRef,
}: {
  kitchens: KitchenSummary[];
  emptyText: string;
  leaving?: ReadonlySet<string>;
  staggerIn?: boolean;
  listRef?: Ref<HTMLUListElement>;
}) {
  if (kitchens.length === 0) {
    return <p className="motion-swap rounded-2xl border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800">{emptyText}</p>;
  }
  return (
    <ul ref={listRef} className="flex flex-col gap-2">
      {kitchens.map((k, i) => {
        const order = staggerIn ? i : 0;
        const isLeaving = leaving?.has(k.slug) ?? false;
        return (
          <li
            key={k.slug}
            data-slug={k.slug}
            style={stagger(order)}
            className={isLeaving ? "motion-enter motion-row motion-leaving" : "motion-enter motion-row"}
          >
            <Link
              href={`/r/${k.slug}`}
              tabIndex={isLeaving ? -1 : undefined}
              className="motion-lift flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{k.name}</span>
                <span className="block truncate text-sm text-zinc-500">{k.area}</span>
              </span>
              <span
                style={stagger(order, CHIP_AFTER_ROW_MS)}
                className="motion-fade flex shrink-0 flex-col items-end gap-1 text-right sm:flex-row sm:items-center sm:gap-2"
              >
                {k.issueSpotted && <Chip className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">Issue spotted</Chip>}
                <PostedChip posted={k.posted} total={k.total} order={order} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PostedChip({ posted, total, order }: { posted: number; total: number; order: number }) {
  if (posted === 0) {
    return (
      <Chip className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
        <span aria-hidden className="motion-pulse size-1.5 rounded-full bg-red-500" />
        No photos today
      </Chip>
    );
  }
  if (posted >= total) {
    // The check pops in once, just after the chip has faded in.
    return (
      <Chip className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
        <svg aria-hidden viewBox="0 0 12 12" style={stagger(order, CHIP_AFTER_ROW_MS + 150)} className="motion-pop size-3">
          <path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {posted}/{total} posted
      </Chip>
    );
  }
  return (
    <Chip className="bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {posted}/{total} posted
    </Chip>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
