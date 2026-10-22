"use client";

import { useEffect, useState } from "react";
import type { SpotToday } from "@/lib/kitchen";
import type { UploadResponse } from "@/app/api/upload/route";
import type { FindingResponse } from "@/app/api/finding/route";
import { compressImage } from "@/lib/compress-image";

const POLL_MS = 2000;
const POLL_GIVE_UP_MS = 90_000;

type CardState =
  | { kind: "empty" }
  | { kind: "uploading" }
  | { kind: "error"; message: string }
  | { kind: "done"; photoId: string; blobUrl: string; capturedAt: string; note: string | null };

export function SpotCards({ token, spots }: { token: string; spots: SpotToday[] }) {
  const done = spots.filter((s) => s.photo).length;
  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {done} of {spots.length} spots done today. One photo per spot per day; photos can&apos;t be replaced.
      </p>
      <ul className="flex flex-col gap-4">
        {spots.map((spot) => (
          <SpotCard key={spot.spotId} token={token} spot={spot} />
        ))}
      </ul>
    </>
  );
}

function SpotCard({ token, spot }: { token: string; spot: SpotToday }) {
  const [state, setState] = useState<CardState>(
    spot.photo ? { kind: "done", photoId: spot.photo.id, ...spot.photo } : { kind: "empty" },
  );

  // While "Checking…", poll until the server has saved Claude's finding.
  const pendingPhotoId = state.kind === "done" && state.note === null ? state.photoId : null;
  useEffect(() => {
    if (!pendingPhotoId) return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const qs = new URLSearchParams({ token, photoId: pendingPhotoId! });
        const body = (await (await fetch(`/api/finding?${qs}`)).json()) as FindingResponse;
        if (body.ok && body.note) {
          setState((s) => (s.kind === "done" ? { ...s, note: body.note } : s));
          return;
        }
      } catch {
        // Network blip; try again on the next tick.
      }
      if (Date.now() - started < POLL_GIVE_UP_MS) timer = setTimeout(poll, POLL_MS);
    }
    timer = setTimeout(poll, POLL_MS);
    return () => clearTimeout(timer);
  }, [pendingPhotoId, token]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ kind: "uploading" });
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("spotId", spot.spotId);
      form.set("photo", await compressImage(file), "photo.jpg");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const body = (await res.json()) as UploadResponse;
      if (!body.ok) {
        // 409: someone already uploaded this spot today; reload shows their photo.
        setState({ kind: "error", message: body.error });
        return;
      }
      setState({ kind: "done", photoId: body.photoId, blobUrl: body.blobUrl, capturedAt: body.capturedAt, note: null });
    } catch {
      setState({ kind: "error", message: "Upload failed. Check your connection and try again." });
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold">{spot.label}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{spot.checklist}</p>
      </div>

      {state.kind === "done" ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL, already 1600px */}
          <img src={state.blobUrl} alt={`${spot.label} today`} className="aspect-[4/3] w-full object-cover" />
          <div className="flex items-center justify-between gap-2 p-4 text-sm">
            <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{state.capturedAt}</span>
            <span className="text-right font-medium">{state.note ?? "Checking…"}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4 pt-0">
          <label
            className={`flex h-12 items-center justify-center rounded-xl bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900 ${
              state.kind === "uploading" ? "pointer-events-none opacity-60" : "cursor-pointer active:opacity-80"
            }`}
          >
            {state.kind === "uploading" ? "Uploading…" : "Take photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={state.kind === "uploading"}
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {state.kind === "error" && <p className="text-sm text-red-600">{state.message}</p>}
        </div>
      )}
    </li>
  );
}
