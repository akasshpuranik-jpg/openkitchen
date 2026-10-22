"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffCodeResponse } from "@/app/api/staff-code/route";

export function StaffCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "wrong" | "failed">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Accept the code on its own or a pasted upload link.
    const value = code.trim().replace(/^.*\/upload\//, "").replace(/[/?#].*$/, "");
    if (!value) return;
    setState("checking");
    try {
      const res = await fetch("/api/staff-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const body = (await res.json().catch(() => null)) as StaffCodeResponse | null;
      if (body?.ok) {
        router.push(body.path);
        return;
      }
      setState(res.status === 404 ? "wrong" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Staff code</span>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (state !== "checking") setState("idle");
          }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 rounded-xl border border-zinc-300 bg-white px-3 font-mono text-base outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <button
        type="submit"
        disabled={state === "checking" || !code.trim()}
        className="h-12 rounded-xl bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {state === "checking" ? "Checking…" : "Continue"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state === "wrong" && "Code not recognised"}
        {state === "failed" && "Couldn't check the code. Please try again."}
      </p>
    </form>
  );
}
