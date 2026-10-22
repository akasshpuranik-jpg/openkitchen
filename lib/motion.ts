import type { CSSProperties } from "react";

// Stagger index for .motion-enter / .motion-fade / .motion-pop items: item i starts
// i × --motion-stagger (60ms) later, plus an optional fixed delay in ms.
// Capped so long lists don't keep animating long after the page has loaded.
export function stagger(i: number, extraMs = 0): CSSProperties {
  return { "--i": Math.min(i, 8), "--d": `${extraMs}ms` } as CSSProperties;
}

// Fixed delay only (e.g. the hero's headline → subline → buttons sequence).
export function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}
