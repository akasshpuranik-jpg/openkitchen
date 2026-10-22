"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the page's server data every 30s while the tab is visible, so photos and
// verdicts posted meanwhile appear without a reload (new photos get "Just posted").
export function LiveRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
