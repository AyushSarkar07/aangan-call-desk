import Link from "next/link";
import { PERIODS, type Period } from "@/lib/views";

export function PeriodTabs({ current, base = "/" }: { current: Period; base?: string }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-[12.5px]">
      {PERIODS.map((p) => (
        <Link
          key={p.key}
          href={p.key === "all" ? base : `${base}?p=${p.key}`}
          className={`rounded-md px-2.5 py-1 ${current === p.key ? "bg-accent-soft font-medium text-accent" : "text-ink-2"}`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
