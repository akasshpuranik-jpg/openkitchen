import type { DayRow, DayState, FindingStatus, Restaurant, SpotToday } from "@/lib/kitchen";
import { KITCHEN_TZ } from "@/lib/kitchen";
import type { CardVM, HistoryVM } from "./diner-types";
import { History } from "./history";
import { SpotGrid } from "./spot-grid";

// Server side of the diner page: turns today's data into plain view data (chips, note
// lines, the 7-day grid) for the client components that animate it.
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

      {/* Today's banner drops in first; a missed day gets one gentle pulse, then stays still. */}
      {missing.length > 0 ? (
        <div
          role="alert"
          className="motion-slide-down-attention rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          Kitchen hasn&apos;t posted the {listSpots(missing)} today
        </div>
      ) : (
        <div className="motion-slide-down rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Kitchen posted all {spots.length} spots today
        </div>
      )}

      <SpotGrid cards={spots.map(toCard)} />

      {days.length > 0 && <History data={toHistory(days)} />}
    </div>
  );
}

const CHIP: Record<FindingStatus | "checking", { label: string; className: string }> = {
  ok: { label: "No issues", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  issues: { label: "Issues", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  unclear: { label: "Unclear", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  checking: { label: "Checking", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" },
  error: { label: "Check pending", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" },
};

function toCard(spot: SpotToday): CardVM {
  const p = spot.photo;
  return {
    spotId: spot.spotId,
    label: spot.label,
    photo: p && {
      id: p.id,
      url: p.blobUrl,
      postedTime: p.postedTime,
      chip: CHIP[p.status ?? "checking"],
      lines: dinerNoteLines(p),
    },
  };
}

// Diners see a neutral line while the automatic check hasn't run (staff still see the
// failure and a "Check again" button on the upload page). Never shown as "no issues".
function dinerNoteLines(photo: NonNullable<SpotToday["photo"]>) {
  if (photo.status === "error" || photo.note === null) return ["Photo posted · automatic check pending"];
  return photo.status === "issues" ? photo.note.split("; ") : [photo.note];
}

// Dot style and the words used in each cell's tooltip and the legend.
const DOT: Record<DayState, { label: string; className: string }> = {
  ok: { label: "No visible issues", className: "bg-green-600" },
  issues: { label: "Issues spotted", className: "bg-amber-500" },
  unclear: { label: "Unclear photo", className: "bg-zinc-400" },
  checking: { label: "Check pending", className: "bg-zinc-300 dark:bg-zinc-600" },
  error: { label: "Check pending", className: "bg-zinc-300 dark:bg-zinc-600" },
  missed: { label: "Not posted", className: "border-2 border-red-500 bg-transparent" },
};

// Days arrive newest first; the grid reads oldest → today, left to right.
function toHistory(daysNewestFirst: DayRow[]): HistoryVM {
  const days = [...daysNewestFirst].reverse();
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: KITCHEN_TZ, weekday: "short" });
  const dayNum = new Intl.DateTimeFormat("en-IN", { timeZone: KITCHEN_TZ, day: "numeric" });
  return {
    days: days.map((d) => {
      const noon = new Date(`${d.date}T12:00:00+05:30`);
      return { date: d.date, weekday: weekday.format(noon), dayNum: dayNum.format(noon), isToday: d.isToday };
    }),
    rows: days[0].spots.map((spot, s) => ({
      key: spot.key,
      label: spot.label,
      cells: days.map((d) => DOT[d.spots[s].state]),
    })),
    legend: (["ok", "issues", "unclear", "error", "missed"] as const).map((state) => DOT[state]),
  };
}

// "stove", "stove and fridge", "prep counter, stove and fridge"
function listSpots(spots: SpotToday[]) {
  return new Intl.ListFormat("en", { type: "conjunction" }).format(spots.map((s) => s.label.toLowerCase()));
}
