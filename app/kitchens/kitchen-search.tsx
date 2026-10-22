"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { KitchenSummary } from "@/lib/kitchen";
import { KitchenRows } from "../_components/kitchen-rows";

// Matches --motion-ui: how long a row takes to fade out, and the gap to close.
const UI_MS = 250;

function matchesQuery(k: KitchenSummary, q: string) {
  return !q || `${k.name} ${k.area}`.toLowerCase().includes(q);
}

// Search with calm list motion: rows that stop matching fade out, then the rows below
// slide up into the gap (FLIP, transform only); rows that match again fade back in.
export function KitchenSearch({ kitchens }: { kitchens: KitchenSummary[] }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<string[]>(() => kitchens.map((k) => k.slug));
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [typed, setTyped] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const tops = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const q = query.trim().toLowerCase();
  const matchCount = kitchens.filter((k) => matchesQuery(k, q)).length;

  function onQuery(value: string) {
    setQuery(value);
    setTyped(true);
    const next = value.trim().toLowerCase();
    const matching = new Set(kitchens.filter((k) => matchesQuery(k, next)).map((k) => k.slug));
    // Keep rows on screen that are matching or still fading out; add new matches in place.
    const visible = new Set([...shown, ...matching]);
    setShown(kitchens.filter((k) => visible.has(k.slug)).map((k) => k.slug));
    setLeaving(new Set([...visible].filter((slug) => !matching.has(slug))));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setShown(kitchens.filter((k) => matching.has(k.slug)).map((k) => k.slug));
      setLeaving(new Set());
    }, UI_MS);
  }

  // FLIP: after each change, rows that moved start at their old position and glide to the
  // new one. offsetTop ignores transforms, so in-flight animations don't skew it.
  useLayoutEffect(() => {
    const list = listRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const el of list ? ([...list.children] as HTMLElement[]) : []) {
      const slug = el.dataset.slug!;
      next.set(slug, el.offsetTop);
      const before = tops.current.get(slug);
      if (reduce || before === undefined || before === el.offsetTop || el.classList.contains("motion-leaving")) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${before - el.offsetTop}px)`;
      void el.offsetWidth; // commit the starting position before animating
      el.style.transition = `transform ${UI_MS}ms var(--motion-ease)`;
      el.style.transform = "";
      el.addEventListener("transitionend", () => (el.style.transition = ""), { once: true });
    }
    tops.current = next;
  }, [shown]);

  useLayoutEffect(() => () => clearTimeout(timer.current), []);

  const bySlug = new Map(kitchens.map((k) => [k.slug, k]));
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Search by name or area</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="e.g. Empire, Arekere"
          className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <p aria-live="polite" className="text-sm text-zinc-500">
        {matchCount} {matchCount === 1 ? "kitchen" : "kitchens"}
      </p>
      <KitchenRows
        kitchens={shown.map((slug) => bySlug.get(slug)!)}
        leaving={leaving}
        staggerIn={!typed}
        listRef={listRef}
        emptyText={`No kitchens match "${query.trim()}".`}
      />
    </div>
  );
}
