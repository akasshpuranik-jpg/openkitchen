"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// width/height are the photo's natural size (from the card's loaded image), so the
// full-size image has its final layout before it decodes and the zoom can be measured.
export type LightboxPhoto = { url: string; alt: string; source: HTMLElement; width?: number; height?: number };

const ZOOM_MS = 400; // --motion-enter
const SWIPE_CLOSE_PX = 90;
const TAP_SLOP_PX = 6;

// Full-screen photo that zooms out of its card (FLIP: transform + opacity only).
// Closes on tap, swipe down or Esc, shrinking back into the card.
export function Lightbox({ photo, onClose }: { photo: LightboxPhoto; onClose: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const drag = useRef<{ y0: number; dy: number; moved: boolean } | null>(null);

  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Transform that makes the full-size image sit exactly over the card's photo.
  function fromCard(img: HTMLImageElement) {
    const from = photo.source.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    if (to.width === 0 || from.width === 0) return "none"; // not laid out yet: just fade
    const scale = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  function animate(img: HTMLImageElement, transform: string, opacity: number) {
    const ms = reduce() ? 0 : ZOOM_MS;
    img.style.transition = `transform ${ms}ms var(--motion-ease)`;
    img.style.transform = transform;
    backdropRef.current!.style.transition = `opacity ${reduce() ? 120 : ZOOM_MS}ms var(--motion-ease)`;
    backdropRef.current!.style.opacity = String(opacity);
  }

  function close() {
    const img = imgRef.current;
    if (closing.current || !img) return;
    closing.current = true;
    animate(img, reduce() ? "none" : fromCard(img), 0);
    setTimeout(() => {
      onClose();
      photo.source.focus({ preventScroll: true });
    }, reduce() ? 120 : ZOOM_MS);
  }

  // Open: start over the card, then zoom to full size. Lock page scroll meanwhile
  // (stable gutter, so nothing behind the overlay shifts sideways).
  useLayoutEffect(() => {
    const root = document.documentElement;
    const before = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";

    const img = imgRef.current!;
    const backdrop = backdropRef.current!;
    backdrop.style.opacity = "0";
    if (!reduce()) {
      img.style.transition = "none";
      img.style.transform = fromCard(img);
      void img.offsetWidth;
    }
    animate(img, "none", 1);
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      root.style.overflow = before.overflow;
      root.style.scrollbarGutter = before.gutter;
    };
    // Runs once per opened photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { y0: e.clientY, dy: 0, moved: false };
    if (imgRef.current) imgRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const img = imgRef.current;
    if (!d || !img || closing.current) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    if (Math.abs(e.clientY - d.y0) > TAP_SLOP_PX) d.moved = true;
    if (reduce()) return;
    img.style.transform = `translateY(${d.dy}px) scale(${1 - Math.min(d.dy, 400) / 2000})`;
    backdropRef.current!.style.transition = "none";
    backdropRef.current!.style.opacity = String(1 - Math.min(d.dy, 300) / 400);
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    const img = imgRef.current;
    if (!d || !img) return;
    if (!d.moved || d.dy > SWIPE_CLOSE_PX) close();
    else animate(img, "none", 1); // not far enough: settle back
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="fixed inset-0 z-50 flex touch-none select-none items-center justify-center p-4"
    >
      <div ref={backdropRef} className="absolute inset-0 bg-black/85" />
      {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL, already ≤1600px */}
      <img
        ref={imgRef}
        src={photo.url}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        draggable={false}
        className="relative h-auto max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl will-change-transform"
      />
      <button
        ref={closeRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={close}
        className="motion-lift absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white"
      >
        Close
      </button>
      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">
        Tap or swipe down to close
      </p>
    </div>
  );
}
