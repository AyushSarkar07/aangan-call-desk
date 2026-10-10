import Link from "next/link";
import { CallDetail } from "@/components/CallDetail";
import { PeriodTabs } from "@/components/PeriodTabs";
import { StatusChip, statusLabel } from "@/components/ui";
import { dur, ist } from "@/lib/format";
import { getStore } from "@/lib/store";
import { STATUSES } from "@/lib/types";
import { loadPeriod, type Period } from "@/lib/views";

export const dynamic = "force-dynamic";

// Call log: every call on the left; the selected call's conversation, outcome, meeting,
// handoff and CRM on the right.
export default async function Calls({ searchParams }: PageProps<"/calls">) {
  const sp = await searchParams;
  const period = (["all", "live", "replay"].includes(String(sp.p)) ? sp.p : "all") as Period;
  const status = STATUSES.find((s) => s === sp.s);
  const { rows } = await loadPeriod(period);
  const shown = status ? rows.filter((r) => r.lead?.status === status) : rows;
  const selectedId = typeof sp.id === "string" ? sp.id : shown[0]?.call.id;
  const selected = selectedId ? await getStore().getCall(selectedId) : null;

  const q = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { p: period !== "all" ? period : undefined, s: status, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/calls?${s}` : "/calls";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px]">Call log</h1>
          <p className="mt-1 text-[13px] text-ink-2">Every call: what was said, how the AI replied, what was decided and what was booked.</p>
        </div>
        <PeriodTabs current={period} base="/calls" />
      </div>

      <div className="flex flex-wrap gap-1.5 text-[12.5px]">
        <Link href={q({ s: undefined })} className={`rounded-md border px-2.5 py-1 ${!status ? "border-accent text-accent" : "border-line text-ink-2"}`}>All ({rows.length})</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={q({ s })} className={`rounded-md border px-2.5 py-1 ${status === s ? "border-accent text-accent" : "border-line text-ink-2"}`}>
            {statusLabel(s)} ({rows.filter((r) => r.lead?.status === s).length})
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-line bg-card py-16 text-center text-[13px] text-muted">No calls here yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <nav aria-label="Calls" className="max-h-[75vh] overflow-y-auto rounded-xl border border-line bg-card lg:sticky lg:top-4">
            <ul className="divide-y divide-line">
              {shown.map(({ call, lead }) => {
                const active = call.id === selectedId;
                const x = lead?.extraction;
                return (
                  <li key={call.id}>
                    <Link
                      href={`${q({ id: call.id })}#call`}
                      aria-current={active ? "true" : undefined}
                      className={`block px-3.5 py-3 ${active ? "bg-accent-soft" : "hover:bg-page"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13.5px] font-medium">{lead?.caller_name ?? "Unknown caller"}</span>
                        <StatusChip status={call.status} />
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-ink-2">
                        {[x?.property, lead?.location].filter(Boolean).join(" · ") || x?.summary || "No details"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
                        <span>{ist(call.start_time)}</span>
                        <span>·</span>
                        <span className="tnum">{dur(call.duration_sec)}</span>
                        {lead?.booking && lead.booking.status !== "failed" && <span title="Meeting booked">· 📅</span>}
                        {call.after_hours && <span>· after hours</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section id="call" className="min-w-0 scroll-mt-4">
            {selected ? (
              <CallDetail call={selected.call} lead={selected.lead} cost={selected.cost} events={selected.events} raw={selected.raw_payload} />
            ) : (
              <p className="rounded-xl border border-line bg-card py-16 text-center text-[13px] text-muted">Pick a call to see the conversation.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
