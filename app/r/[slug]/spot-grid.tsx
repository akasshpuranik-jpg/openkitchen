"use client";

import { useEffect, useState } from "react";
import { stagger } from "@/lib/motion";
import type { CardVM } from "./diner-types";
import { Lightbox, type LightboxPhoto } from "./lightbox";

// Cards start after the banner has dropped in.
const CARD_START_MS = 150;
// How long a live arrival keeps its "Just posted" badge.
const JUST_POSTED_MS = 8000;

export function SpotGrid({ cards }: { cards: CardVM[] }) {
  const [seen, setSeen] = useState(() => new Set(cards.flatMap((c) => (c.photo ? [c.photo.id] : []))));
  const [justPosted, setJustPosted] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState<LightboxPhoto | null>(null);

  // A photo that wasn't here on first load arrived via the 30s live refresh.
  // (Derived during render, React's pattern for reacting to new props.)
  const arrived = cards.flatMap((c) => (c.photo && !seen.has(c.photo.id) ? [c.photo.id] : []));
  if (arrived.length > 0) {
    setSeen(new Set([...seen, ...arrived]));
    setJustPosted(new Set([...justPosted, ...arrived]));
  }

  useEffect(() => {
    if (justPosted.size === 0) return;
    const timer = setTimeout(() => setJustPosted(new Set()), JUST_POSTED_MS);
    return () => clearTimeout(timer);
  }, [justPosted]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card, i) => (
          <SpotCard
            key={card.spotId}
            card={card}
            index={i}
            justPosted={!!card.photo && justPosted.has(card.photo.id)}
            onOpen={setOpen}
          />
        ))}
      </ul>
      {open && <Lightbox photo={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function SpotCard({
  card,
  index,
  justPosted,
  onOpen,
}: {
  card: CardVM;
  index: number;
  justPosted: boolean;
  onOpen: (photo: LightboxPhoto) => void;
}) {
  const photo = card.photo;
  const cardDelay = index * 60 + CARD_START_MS;

  // No overflow-hidden on the card: it would clip the hover shadow, so the photo box
  // rounds its own top corners.
  return (
    <li style={stagger(index, CARD_START_MS)} className="motion-enter motion-lift flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Keyed by photo, so a photo that arrives while the page is open mounts fresh and fades in. */}
      <div key={photo?.id ?? "absent"} className={`flex flex-1 flex-col ${justPosted ? "motion-enter" : ""}`}>
        {photo ? (
          <button
            type="button"
            aria-label={`View ${card.label} photo larger`}
            onClick={(e) => {
              const img = e.currentTarget.querySelector("img");
              onOpen({
                url: photo.url,
                alt: `${card.label}, today`,
                source: e.currentTarget,
                width: img?.naturalWidth || undefined,
                height: img?.naturalHeight || undefined,
              });
            }}
            className="relative block cursor-zoom-in"
          >
            <PhotoBox url={photo.url} alt={`${card.label}, today`} />
            {justPosted && (
              <span className="motion-pop absolute left-3 top-3 rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                Just posted
              </span>
            )}
          </button>
        ) : (
          // Absent, not loading: muted, dashed, no motion.
          <div className="m-3 mb-0 flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700">
            No photo today
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{card.label}</h2>
            {photo && (
              <span
                style={stagger(0, cardDelay + 200)}
                className={`motion-pop shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${photo.chip.className}`}
              >
                {photo.chip.label}
              </span>
            )}
          </div>
          {photo ? (
            <>
              {photo.lines.map((line, j) => (
                <p key={`${j}-${line}`} style={stagger(j, cardDelay + 300)} className="motion-fade text-sm text-zinc-900 dark:text-zinc-100">
                  {line}
                </p>
              ))}
              <p style={stagger(photo.lines.length, cardDelay + 300)} className="motion-fade text-xs tabular-nums text-zinc-500">
                Posted {photo.postedTime}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Not posted today</p>
          )}
        </div>
      </div>
    </li>
  );
}

// 4:3 box that never changes size: a soft shimmer until the image has loaded, then the
// image fades in over it. data-loaded is set on the element directly (no re-render).
function PhotoBox({ url, alt }: { url: string; alt: string }) {
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-t-[calc(1rem-1px)] bg-zinc-100 dark:bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL, already ≤1600px */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) el.dataset.loaded = "";
        }}
        onLoad={(e) => {
          e.currentTarget.dataset.loaded = "";
        }}
        className="motion-img absolute inset-0 size-full object-cover"
      />
      <span aria-hidden className="motion-shimmer-layer absolute inset-0 overflow-hidden">
        <span className="motion-shimmer block h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
      </span>
    </span>
  );
}
