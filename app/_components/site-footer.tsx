export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 text-xs leading-relaxed text-zinc-500">
        <p>
          Photos are taken by kitchen staff on the day and time-stamped by our server (India time), not the phone. Once
          posted, a photo can&apos;t be edited, replaced or deleted. Each photo is checked by Claude, an AI model, against
          that spot&apos;s hygiene checklist; notes describe only what&apos;s visible, and a photo too dark or blurry to
          judge is marked unclear, never clean.
        </p>
        <p className="mt-2">© OpenKitchen</p>
      </div>
    </footer>
  );
}
