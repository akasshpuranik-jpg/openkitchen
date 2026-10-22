"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HistoryVM } from "./diner-types";

type Cell = { row: number; col: number };

// Last 7 days as a grid: one row per spot, one column per day (oldest → today), today's
// column highlighted. Cells fill left to right the first time the grid scrolls into view.
// Hover, focus or tap a cell for a tooltip like "Fridge · Mon · No visible issues".
export function History({ data }: { data: HistoryVM }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Cell | null>(null);
  const last = data.days.length - 1;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof IntersectionObserver === "undefined") return;
    grid.classList.add("motion-cells-pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        grid.classList.add("is-revealed");
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  // A tap elsewhere or Esc closes an open tooltip.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-cell]")) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Last 7 days</h2>
      <div ref={gridRef} className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full table-fixed text-sm">
          <thead className="text-[11px] text-zinc-500">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="w-24 px-3 py-2 text-left font-medium sm:w-32">
                <span className="sr-only">Spot</span>
              </th>
              {data.days.map((d) => (
                <th
                  key={d.date}
                  scope="col"
                  className={`py-2 text-center font-medium leading-tight ${d.isToday ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100" : ""}`}
                >
                  <span className="block">{d.isToday ? "Today" : d.weekday}</span>
                  <span className="block tabular-nums">{d.dayNum}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={row.key} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
                <th scope="row" className="truncate px-3 py-2 text-left text-xs font-normal text-zinc-700 sm:text-sm dark:text-zinc-300">
                  {row.label}
                </th>
                {row.cells.map((cell, c) => {
                  const day = data.days[c];
                  const tip = `${row.label} · ${day.isToday ? "Today" : day.weekday} · ${cell.label}`;
                  const isActive = active?.row === r && active.col === c;
                  // Keep edge tooltips on screen: left-align the first columns, right-align the last.
                  const align = c <= 1 ? "left-0" : c >= last - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <td key={day.date} className={`py-1.5 text-center ${day.isToday ? "bg-zinc-100 dark:bg-zinc-900" : ""}`}>
                      <span className="relative inline-block">
                        <button
                          type="button"
                          data-cell
                          aria-label={tip}
                          aria-describedby={isActive ? `tip-${r}-${c}` : undefined}
                          onMouseEnter={() => setActive({ row: r, col: c })}
                          onMouseLeave={() => setActive((a) => (a?.row === r && a.col === c ? null : a))}
                          onFocus={() => setActive({ row: r, col: c })}
                          onBlur={() => setActive((a) => (a?.row === r && a.col === c ? null : a))}
                          // Open only: a tap also fires mouseenter first, so toggling here would
                          // close it again at once. A tap elsewhere or Esc closes it.
                          onClick={() => setActive({ row: r, col: c })}
                          style={{ "--i": c } as React.CSSProperties}
                          className="motion-cell flex size-7 items-center justify-center rounded-full"
                        >
                          <span className={`size-3 rounded-full ${cell.className}`} />
                        </button>
                        {isActive && (
                          <span
                            id={`tip-${r}-${c}`}
                            role="tooltip"
                            className={`motion-swap pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900 ${align}`}
                          >
                            {tip}
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {data.legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-full ${l.className}`} />
            {l.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
