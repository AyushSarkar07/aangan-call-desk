import { CallsTable } from "@/components/CallsTable";
import { PeriodTabs } from "@/components/PeriodTabs";
import { Card } from "@/components/ui";
import { STATUSES } from "@/lib/types";
import { loadPeriod, type Period } from "@/lib/views";
import Link from "next/link";
import { statusLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Calls({ searchParams }: PageProps<"/calls">) {
  const sp = await searchParams;
  const period = (["all", "live", "replay"].includes(String(sp.p)) ? sp.p : "all") as Period;
  const status = STATUSES.find((s) => s === sp.s);
  const { rows } = await loadPeriod(period);
  const shown = status ? rows.filter((r) => r.lead?.status === status) : rows;
  const q = (s?: string) => `/calls?${new URLSearchParams({ ...(period !== "all" ? { p: period } : {}), ...(s ? { s } : {}) })}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-[26px]">Calls</h1>
        <PeriodTabs current={period} base="/calls" />
      </div>
      <div className="flex flex-wrap gap-1.5 text-[12.5px]">
        <Link href={q()} className={`rounded-md border px-2.5 py-1 ${!status ? "border-accent text-accent" : "border-line text-ink-2"}`}>All ({rows.length})</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={q(s)} className={`rounded-md border px-2.5 py-1 ${status === s ? "border-accent text-accent" : "border-line text-ink-2"}`}>
            {statusLabel(s)} ({rows.filter((r) => r.lead?.status === s).length})
          </Link>
        ))}
      </div>
      <Card><CallsTable rows={shown} /></Card>
    </div>
  );
}
