"use client";

import { useState } from "react";

// Copies this page's URL. If the clipboard is unavailable (e.g. an in-app browser),
// shows the URL so it can be copied by hand.
export function ShareButton() {
  const [state, setState] = useState<"idle" | "copied" | { manual: string }>("idle");

  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState({ manual: url });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={share}
        className="motion-lift h-9 rounded-xl border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <span key={state === "copied" ? "copied" : "share"} className="motion-swap inline-block">
          {state === "copied" ? "Link copied" : "Share this page"}
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Link copied to clipboard" : ""}
      </span>
      {typeof state === "object" && (
        <input
          readOnly
          value={state.manual}
          onFocus={(e) => e.target.select()}
          className="motion-swap w-64 max-w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
      )}
    </div>
  );
}
