import type { DayRow, DayState, FindingStatus, Restaurant, SpotToday } from "@/lib/kitchen";
import { formatKitchenDay } from "@/lib/kitchen";

// Pure view: all data, times and notes are computed on the server before this renders.
export function DinerView({
  restaurant,
  todayLabel,
  spots,
  days,
}: {
  restaurant: Pick<Restaurant, "name" | "area">;
  todayLabel: string;
  spots: SpotToday[];
  days: DayRow[];
}) {
  const missing = spots.filter((s) => !s.photo);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{restaurant.name}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{restaurant.area}</p>
        <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Today&apos;s kitchen <span className="font-normal text-zinc-500">· {todayLabel}</span>
        </p>
      </header>

      {missing.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Kitchen hasn&apos;t posted the {listSpots(missing)} today
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {spots.map((spot) => (
          <SpotCard key={spot.spotId} spot={spot} />
        ))}
      </ul>

      {days.length > 0 && <History days={days} />}

      <footer className="border-t border-zinc-200 pt-4 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800">
        Photos are taken by kitchen staff on the day and time-stamped by our server (India time). They can&apos;t be
        replaced or deleted. Notes come from an automated photo check and describe only what&apos;s visible.
      </footer>
    </div>
  );
}

function SpotCard({ spot }: { spot: SpotToday }) {
  const photo = spot.photo;
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Blob URL, already 1600px
        <img src={photo.blobUrl} alt={`${spot.label}, today`} loading="lazy" className="aspect-[4/3] w-full bg-zinc-100 object-cover dark:bg-zinc-900" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
          No photo yet today
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{spot.label}</h2>
          {photo && <StatusChip status={photo.status} />}
        </div>
        {photo ? (
          <>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{dinerNote(photo)}</p>
            <p className="text-xs tabular-nums text-zinc-500">Posted {photo.postedTime}</p>
          </>
        ) : (
          <p className="text-sm text-red-700 dark:text-red-300">Not posted today</p>
        )}
      </div>
    </li>
  );
}

// Diners see a neutral line while the automatic check hasn't run (staff still see the
// failure and a "Check again" button on the upload page). Never shown as "no issues".
function dinerNote(photo: NonNullable<SpotToday["photo"]>) {
  if (photo.status === "error" || photo.note === null) return "Photo posted · automatic check pending";
  return photo.note;
}

const CHIP: Record<FindingStatus | "checking", { label: string; className: string }> = {
  ok: { label: "No issues", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  issues: { label: "Issues", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  unclear: { label: "Unclear", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  checking: { label: "Checking", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" },
  error: { label: "Check pending", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" },
};

function StatusChip({ status }: { status: FindingStatus | null }) {
  const chip = CHIP[status ?? "checking"];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.className}`}>{chip.label}</span>;
}

const DOT: Record<DayState, { label: string; className: string }> = {
  ok: { label: "No issues", className: "bg-green-600" },
  issues: { label: "Issues", className: "bg-amber-500" },
  unclear: { label: "Unclear", className: "bg-zinc-400" },
  checking: { label: "Checking", className: "bg-zinc-300 dark:bg-zinc-600" },
  error: { label: "Check pending", className: "bg-zinc-300 dark:bg-zinc-600" },
  missed: { label: "Missed", className: "border-2 border-red-500 bg-transparent" },
};

function History({ days }: { days: DayRow[] }) {
  const spotLabels = days[0].spots.map((s) => s.label);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Last 7 days</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">Day</th>
              {spotLabels.map((label) => (
                <th key={label} scope="col" className="px-1 py-2 text-center font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal whitespace-nowrap tabular-nums text-zinc-700 dark:text-zinc-300">
                  {day.isToday ? "Today" : formatKitchenDay(day.date)}
                </th>
                {day.spots.map((s) => (
                  <td key={s.key} className="px-1 py-2.5 text-center">
                    <span
                      role="img"
                      aria-label={`${s.label}: ${DOT[s.state].label}`}
                      title={`${s.label}: ${DOT[s.state].label}`}
                      className={`inline-block size-3 rounded-full align-middle ${DOT[s.state].className}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {(["ok", "issues", "unclear", "error", "missed"] as const).map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-full ${DOT[state].className}`} />
            {DOT[state].label}
          </li>
        ))}
      </ul>
    </section>
  );
}

// "stove", "stove and fridge", "prep counter, stove and fridge"
function listSpots(spots: SpotToday[]) {
  return new Intl.ListFormat("en", { type: "conjunction" }).format(spots.map((s) => s.label.toLowerCase()));
}
