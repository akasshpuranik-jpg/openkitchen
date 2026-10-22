"use client";

import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";

type Step = { title: string; body: string };

// Each step appears 400ms (one --motion-enter) after the previous; the line to the next
// marker starts drawing halfway through, so it arrives as the next step appears.
const STEP_MS = 400;

// "How it works" as a timeline: markers joined by a thin line (down the left on a phone,
// across the top from 640px). Steps reveal one after another the first time the list
// scrolls into view. Without JS, or before hydration, everything is simply visible.
export function StepsReveal({ steps }: { steps: Step[] }) {
  const listRef = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    const items = [...list.children] as HTMLElement[];
    // Hide before first paint, then reveal once the list is on screen.
    items.forEach((el) => el.classList.add("motion-reveal-pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        items.forEach((el) => el.classList.add("is-revealed"));
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={listRef} className="flex flex-col gap-3 sm:flex-row">
      {steps.map((step, i) => (
        <li
          key={step.title}
          style={{ "--d": `${i * STEP_MS}ms` } as CSSProperties}
          className="relative flex flex-1 gap-3 sm:flex-col"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              style={{ "--d": `${i * STEP_MS + STEP_MS / 2}ms` } as CSSProperties}
              className="motion-line absolute left-[11.5px] top-6 h-[calc(100%-1.5rem+0.75rem)] w-px bg-zinc-300 sm:left-6 sm:top-[11.5px] sm:h-px sm:w-[calc(100%-1.5rem+0.75rem)] dark:bg-zinc-700"
            />
          )}
          <span
            aria-hidden
            className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-[var(--background)] text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            {i + 1}
          </span>
          <div className="motion-lift flex flex-1 flex-col gap-1 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500">Step {i + 1}</span>
            <span className="font-medium">{step.title}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{step.body}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
