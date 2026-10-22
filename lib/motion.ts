import type { CSSProperties } from "react";

// Stagger index for .motion-enter items: item i starts i × --motion-stagger (60ms) later.
// Capped so long lists don't keep animating long after the page has loaded.
export function stagger(i: number): CSSProperties {
  return { "--i": Math.min(i, 8) } as CSSProperties;
}
