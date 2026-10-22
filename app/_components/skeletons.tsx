// Static loading placeholders shaped like the real content, so nothing below them (e.g.
// the footer) jumps when streamed data arrives. No animation: they're on screen briefly.

const BAR = "rounded-md bg-zinc-100 dark:bg-zinc-900";

// One row by default: the MVP lists a single seeded restaurant, and a skeleton taller
// than the real list would make the footer jump up instead.
export function KitchenRowsSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <ul aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex h-[74px] items-center justify-between rounded-2xl border border-zinc-200 px-4 dark:border-zinc-800">
          <span className="flex flex-col gap-2">
            <span className={`${BAR} h-4 w-36`} />
            <span className={`${BAR} h-3 w-24`} />
          </span>
          <span className={`${BAR} h-5 w-20 rounded-full`} />
        </li>
      ))}
    </ul>
  );
}

// Mirrors DinerView: header lines, today's banner, 4 photo cards, the 7-day grid.
export function DinerSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={`${BAR} h-8 w-56`} />
        <span className={`${BAR} h-4 w-36`} />
        <span className={`${BAR} mt-3 h-4 w-48`} />
      </div>
      <span className={`${BAR} h-12 rounded-xl`} />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="aspect-[4/3] rounded-t-[calc(1rem-1px)] bg-zinc-100 dark:bg-zinc-900" />
            <span className="flex flex-col gap-2 p-4">
              <span className={`${BAR} h-5 w-28`} />
              <span className={`${BAR} h-4 w-40`} />
              <span className={`${BAR} h-3 w-24`} />
            </span>
          </li>
        ))}
      </ul>
      <span className={`${BAR} h-64 rounded-2xl`} />
    </div>
  );
}
