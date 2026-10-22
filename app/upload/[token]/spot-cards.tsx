"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import type { FindingStatus, SpotToday } from "@/lib/kitchen";
import type { UploadResponse } from "@/app/api/upload/route";
import type { FindingResponse } from "@/app/api/finding/route";
import type { RecheckResponse } from "@/app/api/recheck/route";
import { compressImage } from "@/lib/compress-image";
import { stagger } from "@/lib/motion";

const POLL_MS = 2000;
const POLL_GIVE_UP_MS = 90_000;

type CardState =
  | { kind: "empty"; picking: boolean; failed: string | null }
  | { kind: "uploading"; preview: string; progress: number; label: string }
  | {
      kind: "done";
      photoId: string;
      imageUrl: string;
      postedTime: string;
      note: string | null; // null while Claude is checking
      status: FindingStatus | null;
      fresh: boolean; // verdict arrived on this page, so animate it in
      rechecking: boolean;
      stalled: boolean; // polling gave up before a verdict: stop the scan, ask for a refresh
    };

// Staff-facing wording and colour for each verdict.
const VERDICT: Record<FindingStatus, { chip: string; className: string }> = {
  ok: { chip: "No visible issues", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  issues: { chip: "Issues spotted", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  unclear: { chip: "Unclear photo", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  error: { chip: "Not checked", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" },
};

export function SpotCards({ token, spots, publicPath }: { token: string; spots: SpotToday[]; publicPath: string }) {
  const [uploadedHere, setUploadedHere] = useState(0);
  const done = spots.filter((s) => s.photo).length + uploadedHere;
  const allDone = done >= spots.length;

  return (
    <>
      <section aria-label="Today's progress" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">
            {done} of {spots.length} spots done
          </span>
          <span className="text-xs text-zinc-500">Photos can&apos;t be replaced</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={spots.length}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            style={{ "--progress": done / spots.length } as CSSProperties}
            className="motion-progress h-full rounded-full bg-green-600"
          />
        </div>
        {allDone && (
          <div className="motion-enter mt-2 flex flex-col gap-1 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <p className="font-medium text-green-900 dark:text-green-200">All set for today. Diners can see your kitchen now.</p>
            <Link href={publicPath} className="motion-link text-sm font-medium text-green-800 underline underline-offset-4 dark:text-green-300">
              See your public page →
            </Link>
          </div>
        )}
      </section>
      <ul className="flex flex-col gap-4">
        {spots.map((spot) => (
          <SpotCard key={spot.spotId} token={token} spot={spot} onUploaded={() => setUploadedHere((n) => n + 1)} />
        ))}
      </ul>
    </>
  );
}

function SpotCard({ token, spot, onUploaded }: { token: string; spot: SpotToday; onUploaded: () => void }) {
  const [state, setState] = useState<CardState>(
    spot.photo
      ? {
          kind: "done",
          photoId: spot.photo.id,
          imageUrl: spot.photo.blobUrl,
          postedTime: spot.photo.postedTime,
          note: spot.photo.note,
          status: spot.photo.status,
          fresh: false,
          rechecking: false,
          stalled: false,
        }
      : { kind: "empty", picking: false, failed: null },
  );
  const [shakes, setShakes] = useState(0);
  const cardRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  // "Opening camera…" goes back to "Take photo" if the picker is dismissed. Browsers
  // without the input's cancel event fall back to "page regained focus, no photo".
  const picking = state.kind === "empty" && state.picking;
  useEffect(() => {
    const input = inputRef.current;
    if (!picking || !input) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => setState((s) => (s.kind === "empty" ? { ...s, picking: false } : s));
    const onFocus = () => {
      timer = setTimeout(() => {
        if (!input.files?.length) reset();
      }, 1000);
    };
    input.addEventListener("cancel", reset);
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      input.removeEventListener("cancel", reset);
      window.removeEventListener("focus", onFocus);
    };
  }, [picking]);

  // One gentle shake per failure: restart the CSS animation each time `shakes` goes up.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || shakes === 0) return;
    card.classList.remove("motion-shake");
    void card.offsetWidth;
    card.classList.add("motion-shake");
    const done = () => card.classList.remove("motion-shake");
    card.addEventListener("animationend", done, { once: true });
    return () => card.removeEventListener("animationend", done);
  }, [shakes]);

  // Free the local preview when the card goes away.
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  // While Claude is checking, poll until the server has saved the finding.
  const pendingPhotoId = state.kind === "done" && state.note === null && !state.rechecking ? state.photoId : null;
  useEffect(() => {
    if (!pendingPhotoId) return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const qs = new URLSearchParams({ token, photoId: pendingPhotoId! });
        const body = (await (await fetch(`/api/finding?${qs}`)).json()) as FindingResponse;
        if (body.ok && body.note) {
          setState((s) => (s.kind === "done" ? { ...s, note: body.note, status: body.status, fresh: true } : s));
          if (body.status === "error") setShakes((n) => n + 1);
          return;
        }
      } catch {
        // Network blip; try again on the next tick.
      }
      if (Date.now() - started < POLL_GIVE_UP_MS) timer = setTimeout(poll, POLL_MS);
      // Stop the scanning band rather than let it loop with nothing behind it.
      else setState((s) => (s.kind === "done" ? { ...s, stalled: true } : s));
    }
    timer = setTimeout(poll, POLL_MS);
    return () => clearTimeout(timer);
  }, [pendingPhotoId, token]);

  function fail(message: string) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setState({ kind: "empty", picking: false, failed: message });
    setShakes((n) => n + 1);
  }

  async function onFile(file: File | undefined) {
    if (!file) {
      setState((s) => (s.kind === "empty" ? { ...s, picking: false } : s));
      return;
    }
    // Show the photo straight away while it's prepared and uploaded.
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setState({ kind: "uploading", preview, progress: 0.05, label: "Preparing photo…" });

    let photo: Blob;
    try {
      photo = await compressImage(file);
    } catch {
      fail("Couldn't read that photo. Take it again with the camera.");
      return;
    }
    const form = new FormData();
    form.set("token", token);
    form.set("spotId", spot.spotId);
    form.set("photo", photo, "photo.jpg");
    const res = await uploadWithProgress(form, (fraction) =>
      setState((s) => (s.kind === "uploading" ? { ...s, progress: 0.1 + fraction * 0.85, label: "Uploading…" } : s)),
    );
    if (!res) return fail("Upload failed. Check your connection and try again.");
    // Platform errors (e.g. a 413 from Vercel or a 500) may not be our JSON shape.
    if (!res.body) return fail(`Upload failed (error ${res.status}). Please try again.`);
    // 409: someone already uploaded this spot today; reload shows their photo.
    if (!res.body.ok) return fail(res.body.error);

    setState({
      kind: "done",
      photoId: res.body.photoId,
      imageUrl: preview, // keep the local copy on screen: same photo, no reload flicker
      postedTime: res.body.postedTime,
      note: null,
      status: null,
      fresh: true,
      rechecking: false,
      stalled: false,
    });
    onUploaded();
  }

  // Re-run Claude's check on this photo when the last attempt failed (no retake needed).
  async function recheck(photoId: string) {
    setState((s) => (s.kind === "done" ? { ...s, rechecking: true } : s));
    let result: { status: FindingStatus; note: string } | undefined;
    try {
      const res = await fetch("/api/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, photoId }),
      });
      const body = (await res.json().catch(() => null)) as RecheckResponse | null;
      result = body?.ok ? body.results.find((r) => r.photoId === photoId) : undefined;
    } catch {
      // Treated as still failed below.
    }
    setState((s) => (s.kind === "done" ? { ...s, rechecking: false, fresh: true, ...(result && { note: result.note, status: result.status }) } : s));
    if (!result || result.status === "error") setShakes((n) => n + 1);
  }

  return (
    <li ref={cardRef} className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold">{spot.label}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{spot.checklist}</p>
      </div>

      {state.kind === "uploading" && (
        <>
          <Photo url={state.preview} label={spot.label} dimmed />
          <div className="p-4">
            <ProgressButton label={state.label} progress={state.progress} />
          </div>
        </>
      )}

      {state.kind === "done" && <Verdict state={state} label={spot.label} onRecheck={() => recheck(state.photoId)} />}

      {state.kind === "empty" && (
        <div className="flex flex-col gap-2 p-4 pt-0">
          <label
            onClick={() => setState((s) => (s.kind === "empty" ? { ...s, picking: true, failed: null } : s))}
            className="motion-lift flex h-12 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            <span key={state.picking ? "picking" : "take"} className="motion-swap">
              {state.picking ? "Opening camera…" : "Take photo"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {state.failed && (
            <p role="alert" className="motion-swap text-sm text-red-600">
              {state.failed}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Verdict({
  state,
  label,
  onRecheck,
}: {
  state: Extract<CardState, { kind: "done" }>;
  label: string;
  onRecheck: () => void;
}) {
  const checking = (state.note === null && !state.stalled) || state.rechecking;
  const verdict = !checking && state.status ? VERDICT[state.status] : null;
  // Note lines appear one after another. "No visible issues" is already the chip.
  const lines =
    !checking && state.note === null
      ? ["Still checking. Refresh the page in a minute to see the result."]
      : checking || !state.note || state.status === "ok"
      ? []
      : state.status === "error"
        ? ["Claude couldn't check this photo yet. Your photo is saved."]
        : state.note.split("; ");
  const animate = state.fresh;

  return (
    <div>
      <div className="relative">
        <Photo url={state.imageUrl} label={label} />
        {checking && <Scanning />}
        {animate && !checking && state.status === "issues" && (
          <span aria-hidden className="motion-flash pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_rgb(239_68_68)]" />
        )}
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p className={`flex items-center gap-1.5 text-xs tabular-nums text-zinc-500 ${animate ? "motion-enter" : ""}`} style={stagger(0, 150)}>
          <LockIcon />
          Posted {state.postedTime} IST · can&apos;t be replaced
        </p>

        {verdict && (
          <span
            role="status"
            className={`self-start rounded-full px-2.5 py-0.5 text-sm font-medium ${verdict.className} ${animate ? "motion-slide-in" : ""}`}
          >
            {verdict.chip}
          </span>
        )}

        {lines.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-zinc-800 dark:text-zinc-200">
            {lines.map((line, i) => (
              <li key={line} style={stagger(i + 1, 120)} className={animate ? "motion-slide-in" : ""}>
                {line}
              </li>
            ))}
          </ul>
        )}

        {!checking && state.status === "error" && (
          <button
            type="button"
            onClick={onRecheck}
            className="motion-lift motion-swap mt-1 h-10 w-full rounded-xl border border-zinc-300 text-sm font-medium dark:border-zinc-700"
          >
            Check again
          </button>
        )}
      </div>
    </div>
  );
}

function Photo({ url, label, dimmed = false }: { url: string; label: string; dimmed?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local preview or Blob URL, already ≤1600px
    <img
      src={url}
      alt={`${label} today`}
      className={`aspect-[4/3] w-full object-cover transition-opacity duration-[var(--motion-ui)] ${dimmed ? "opacity-70" : ""}`}
    />
  );
}

// A soft light band sweeping top to bottom while Claude checks the photo. No spinner.
function Scanning() {
  return (
    <div className="motion-swap pointer-events-none absolute inset-0 overflow-hidden">
      <div className="motion-scan h-1/3 w-full bg-gradient-to-b from-transparent via-white/45 to-transparent" />
      <p role="status" className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
        Claude is checking the photo…
      </p>
    </div>
  );
}

function ProgressButton({ label, progress }: { label: string; progress: number }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="relative flex h-12 items-center justify-center overflow-hidden rounded-xl bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900"
    >
      <div
        style={{ "--progress": progress } as CSSProperties}
        className="motion-progress absolute inset-0 bg-white/15 dark:bg-zinc-900/15"
      />
      <span className="relative tabular-nums">
        {label} {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
    </svg>
  );
}

// fetch can't report upload progress, so use XHR for the photo upload.
function uploadWithProgress(
  form: FormData,
  onProgress: (fraction: number) => void,
): Promise<{ status: number; body: UploadResponse | null } | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: UploadResponse | null = null;
      try {
        body = JSON.parse(xhr.responseText) as UploadResponse;
      } catch {
        // Not our JSON (platform error page).
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => resolve(null);
    xhr.send(form);
  });
}
