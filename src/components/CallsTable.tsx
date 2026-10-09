import Link from "next/link";
import { dur, FLAG_LABEL, ist } from "@/lib/format";
import type { CallRow } from "@/lib/store/types";
import { Pill, StatusChip } from "./ui";

export function CallsTable({ rows, compact = false }: { rows: CallRow[]; compact?: boolean }) {
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-muted">No calls.</p>;
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11.5px] uppercase tracking-wide text-muted">
            <th className="px-4 py-2 font-medium sm:pl-0">When</th>
            <th className="py-2 pr-3 font-medium">Caller</th>
            <th className="py-2 pr-3 font-medium">Project</th>
            <th className="py-2 pr-3 font-medium">Outcome</th>
            {!compact && <th className="py-2 pr-3 font-medium">Notes</th>}
            <th className="py-2 pr-4 text-right font-medium sm:pr-0">Length</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ call, lead }) => {
            const x = lead?.extraction;
            const ref = call.vaani_call_id?.startsWith("replay:") ? call.vaani_call_id.slice(7) : null;
            return (
              <tr key={call.id} className="border-b border-line last:border-0 hover:bg-page">
                <td className="whitespace-nowrap px-4 py-2.5 align-top sm:pl-0">
                  <Link href={`/calls/${call.id}`} className="text-ink hover:text-accent">{ist(call.start_time)}</Link>
                  <div className="mt-0.5 flex gap-1">
                    {ref && <Pill>{ref}</Pill>}
                    {call.after_hours && <Pill tone="info">After hours</Pill>}
                  </div>
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <Link href={`/calls/${call.id}`} className="font-medium hover:text-accent">{lead?.caller_name ?? "Unknown caller"}</Link>
                  <div className="text-[12px] text-muted">{call.caller_phone ?? "Number withheld"}</div>
                </td>
                <td className="max-w-[240px] py-2.5 pr-3 align-top text-ink-2">
                  {[x?.property, lead?.location].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="py-2.5 pr-3 align-top">
                  <StatusChip status={call.status} />
                  {call.linked_call_id && <div className="mt-1 text-[11.5px] text-muted">Rang back: merged</div>}
                  {lead?.assigned_to && <div className="mt-1 text-[11.5px] text-good">✓ {lead.assigned_to}</div>}
                </td>
                {!compact && (
                  <td className="max-w-[300px] py-2.5 pr-3 align-top text-[12px] text-ink-2">
                    <div className="line-clamp-2">{lead?.reasons[0] ?? x?.summary ?? call.error ?? ""}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {lead?.flags.filter((f) => FLAG_LABEL[f]).slice(0, 3).map((f) => <Pill key={f} tone={f === "price_quoted" ? "bad" : "plain"}>{FLAG_LABEL[f]}</Pill>)}
                    </div>
                  </td>
                )}
                <td className="tnum whitespace-nowrap py-2.5 pr-4 text-right align-top text-ink-2 sm:pr-0">{dur(call.duration_sec)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
