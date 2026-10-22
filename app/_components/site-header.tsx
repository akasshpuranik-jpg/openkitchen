import Link from "next/link";

// Public navigation. The staff upload page is deliberately not linked from here.
const NAV = [
  { href: "/kitchens", label: "Kitchens" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/for-restaurants", label: "For restaurants" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="motion-link flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          OpenKitchen
        </Link>
        <nav aria-label="Main" className="-mx-2 flex text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="motion-lift rounded-lg px-2 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  // A pan seen from above, with a check mark: a kitchen, checked.
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-green-600">
      <circle cx="10" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
      <path d="M17.5 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m6.8 12.2 2.2 2.2 4.2-4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
