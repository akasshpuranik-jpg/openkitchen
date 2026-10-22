"use client";

import { useState } from "react";
import type { KitchenSummary } from "@/lib/kitchen";
import { KitchenRows } from "../_components/kitchen-rows";

export function KitchenSearch({ kitchens }: { kitchens: KitchenSummary[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? kitchens.filter((k) => `${k.name} ${k.area}`.toLowerCase().includes(q)) : kitchens;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Search by name or area</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Empire, Arekere"
          className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <p aria-live="polite" className="text-sm text-zinc-500">
        {matches.length} {matches.length === 1 ? "kitchen" : "kitchens"}
      </p>
      <KitchenRows kitchens={matches} emptyText={`No kitchens match "${query.trim()}".`} />
    </div>
  );
}
