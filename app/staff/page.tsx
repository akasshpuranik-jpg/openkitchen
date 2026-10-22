import type { Metadata } from "next";
import { StaffCodeForm } from "./staff-code-form";

export const metadata: Metadata = {
  title: "Staff · OpenKitchen",
  robots: { index: false, follow: false },
};

// Not linked from the site navigation. Staff who lost their upload link enter their code here.
export default function StaffPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen staff</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your kitchen&apos;s staff code, or paste your upload link, to post today&apos;s photos.
        </p>
      </header>
      <StaffCodeForm />
    </main>
  );
}
