export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">OpenKitchen</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        See today&apos;s kitchen photos before you order. Each restaurant page shows photos posted by
        kitchen staff today, with server time stamps and a photo check.
      </p>
    </main>
  );
}
