"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/calls", label: "Calls" },
  { href: "/simulate", label: "Test a call" },
  { href: "/calibration", label: "Accuracy" },
  { href: "/system", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-[19px] font-semibold tracking-tight text-accent">Aangan</span>
          <span className="text-[13px] text-ink-2">Call Desk</span>
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] ${active ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-page"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
