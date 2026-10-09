import Link from "next/link";
import { ReplayButton } from "@/components/ReplayButton";
import { Card, Stat, StatusChip } from "@/components/ui";
import { SEPTEMBER } from "@/fixtures/september";
import { inr } from "@/lib/format";
import { getConfig } from "@/lib/config";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Calibration() {
  const rows = await getStore().listCalls({ source: "replay" });
  const byRef = new Map(rows.map((r) => [r.call.vaani_call_id?.slice(7), r]));
  const results = SEPTEMBER.map((f) => {
    const r = byRef.get(f.ref);
    const got = r?.call.status ?? null;
    const ok = got != null && (got === f.expected || (f.alsoAcceptable ?? []).includes(got as never));
    return { f, r, got, ok };
  });
  const run = results.filter((x) => x.got);
  const correct = run.filter((x) => x.ok).length;
  // The costly mistakes: a good lead turned away, or a bad one sent to a designer.
  const lostLeads = run.filter((x) => x.f.expected === "QUALIFIED" && x.got === "DISQUALIFIED").length;
  const wastedDesigner = run.filter((x) => x.f.expected === "DISQUALIFIED" && x.got === "QUALIFIED").length;
  const cost = run.reduce((s, x) => s + (x.r?.cost?.total_cost ?? 0), 0);
  const ai = getConfig().ai;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px]">Does it judge like Nikhil?</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-ink-2">
            September&apos;s 20 phone enquiries (21 calls; T17 dropped and rang back), replayed through the live pipeline and checked against the outcome Nikhil&apos;s rubric gives.
            {ai === "simulated" && " Gemini is not configured, so this run uses the keyword fallback and will be inaccurate."}
          </p>
        </div>
        <ReplayButton label={run.length ? "Re-run replay" : "Run replay"} />
      </div>

      {run.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Matches the rubric" value={`${correct} / ${run.length}`} tone={correct === run.length ? "good" : undefined} note={`${Math.round((correct / run.length) * 100)}% agreement`} />
          <Stat label="Good leads turned away" value={lostLeads} tone={lostLeads ? "bad" : "good"} note="Qualified per rubric, declined by the system" />
          <Stat label="Designer time wasted" value={wastedDesigner} tone={wastedDesigner ? "bad" : "good"} note="Should be declined, sent to a designer" />
          <Stat label="Cost of the whole replay" value={inr(cost, 2)} note={`${inr(run.length ? cost / run.length : 0, 2)} per call`} />
        </div>
      )}

      <Card>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium sm:pl-0">Call</th>
                <th className="py-2 pr-3 font-medium">Rubric says</th>
                <th className="py-2 pr-3 font-medium">System said</th>
                <th className="py-2 pr-4 font-medium sm:pr-0">Why</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ f, r, got, ok }) => (
                <tr key={f.ref} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 align-top font-medium sm:pl-0">
                    {r ? <Link href={`/calls/${r.call.id}`} className="hover:text-accent">{f.ref}</Link> : f.ref}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <StatusChip status={f.expected} />
                    {f.alsoAcceptable && <div className="mt-1 text-[11px] text-muted">or {f.alsoAcceptable.map((s) => s.toLowerCase().replace("_", " ")).join(", ")}</div>}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {got ? (
                      <span className="inline-flex items-center gap-1.5">
                        <StatusChip status={got} />
                        <span className={ok ? "text-good" : "text-bad"} aria-label={ok ? "match" : "mismatch"}>{ok ? "✓" : "✕"}</span>
                      </span>
                    ) : (
                      <span className="text-muted">Not run</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-[12.5px] text-ink-2 sm:pr-0">
                    {f.why}
                    {r?.lead && !ok && <div className="mt-1 text-bad">System: {r.lead.reasons.join(" ") || r.lead.status}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
