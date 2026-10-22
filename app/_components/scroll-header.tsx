"use client";

import { useEffect, useRef } from "react";

const SCROLLED_PX = 8;

// Sticky header that gets its translucent, blurred backdrop and hairline once the page
// is scrolled past 8px. Sets data-scrolled directly (no re-render on every scroll).
export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.toggleAttribute("data-scrolled", window.scrollY > SCROLLED_PX);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update(); // e.g. a reload that restores a scrolled position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} className="motion-header">
      <span
        aria-hidden
        className="motion-header-backdrop absolute inset-0 -z-10 border-b border-zinc-900/10 bg-[var(--background)]/80 backdrop-blur-md backdrop-saturate-150 dark:border-white/10"
      />
      {children}
    </header>
  );
}
