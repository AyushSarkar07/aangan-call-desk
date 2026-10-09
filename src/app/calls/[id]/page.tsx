import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Pill, StatusChip, VerdictMark } from "@/components/ui";
import { dur, FLAG_LABEL, inr, ist } from "@/lib/format";
import { getStore } from "@/lib/store";
import { pricingLeaks } from "@/lib/transcript";
import { CRITERIA, CRITERION_LABEL } from "@/lib/types";
import { SEPTEMBER } from "@/fixtures/september";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  "ai.extract": "Gemini read the transcript",
  "rubric.decide": "Rubric applied",
  "compliance.pricing": "Pricing guardrail checked",
  "dedupe.linked_dropped_call": "Merged an earlier dropped call",
  "cal.book": "Consultation booked",
  "telegram.handoff": "Handoff sent on Telegram",
  "telegram.claimed": "Designer claimed the lead",
  "hubspot.deal": "Deal created in HubSpot",
  "vaani.payload": "Vaani payload checked",
};

export default async function CallPage({ params }: PageProps<"/calls/[id]">) {
  const { id } = await params;
  const data = await getStore().getCall(id);
  if (!data) notFound();
  const { call, lead, cost, events } = data;
  const x = lead?.extraction;
  const leaks = new Set(pricingLeaks(call.transcript));
  const fixture = call.vaani_call_id?.startsWith("replay:") ? SEPTEMBER.find((f) => f.ref === call.vaani_call_id!.slice(7)) : null;

  return (
    <div className="space-y-5">
      <Link href="/calls" className="text-[12.5px] text-accent">← Calls</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] leading-tight">{lead?.caller_name ?? "Unknown caller"}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {ist(call.start_time, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} · {dur(call.duration_sec)} · {call.caller_phone ?? "number withheld"}
            {call.after_hours && " · after hours"} · {call.source === "vaani" ? "Vaani phone call" : call.source === "replay" ? `September replay (${fixture?.ref})` : "Test call"}
          </p>
          {x && <p className="mt-2 max-w-2xl text-[14px]">{x.summary}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusChip status={call.status} />
          {lead?.priority && lead.priority !== "normal" && <Pill tone="bad">{lead.priority === "urgent" ? "Urgent" : "High priority"}</Pill>}
        </div>
      </div>

      {call.linked_call_id && (
        <div className="rounded-lg border border-line bg-card px-4 py-3 text-[13px]">
          This call dropped. The same number rang back: <Link className="text-accent" href={`/calls/${call.linked_call_id}`}>see the call-back</Link>.
        </div>
      )}
      {fixture && (
        <div className={`rounded-lg px-4 py-3 text-[13px] ${fixture.expected === call.status || fixture.alsoAcceptable?.includes(call.status as never) ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          Rubric says <b>{fixture.expected}</b>{fixture.alsoAcceptable ? ` (or ${fixture.alsoAcceptable.join(", ")})` : ""}: {fixture.why}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {lead && (
            <Card title="Nikhil's five criteria" sub="Decided in code from the facts Gemini extracted. Quotes are the caller's own words.">
              <ul className="divide-y divide-line">
                {CRITERIA.map((k) => {
                  const c = lead.criteria[k];
                  return (
                    <li key={k} className="flex gap-2 py-2.5 text-[13px]">
                      <VerdictMark v={c.verdict} />
                      <div>
                        <div><span className="font-medium">{CRITERION_LABEL[k]}.</span> {c.note}</div>
                        {c.evidence && <div className="mt-0.5 text-[12.5px] italic text-muted">“{c.evidence}”</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {lead.reasons.length > 0 && (
                <div className="mt-3 rounded-md bg-page px-3 py-2 text-[12.5px] text-ink-2">
                  <b>Outcome:</b> {lead.reasons.join(" ")}
                </div>
              )}
              {lead.flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">{lead.flags.map((f) => <Pill key={f} tone={f === "price_quoted" ? "bad" : "plain"}>{FLAG_LABEL[f] ?? f}</Pill>)}</div>
              )}
            </Card>
          )}

          <Card title="Transcript" sub={leaks.size ? "Lines in red quoted a price, which pricing.md forbids." : undefined}>
            {call.transcript.length === 0 ? (
              <p className="text-[13px] text-muted">No conversation (missed or dropped call).</p>
            ) : (
              <ol className="space-y-2.5">
                {call.transcript.map((t, i) => (
                  <li key={i} className={`flex ${t.speaker === "agent" ? "" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed ${leaks.has(t.text) ? "bg-bad-soft text-bad" : t.speaker === "agent" ? "bg-page" : "bg-accent-soft"}`}>
                      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.speaker === "agent" ? "Aangan (AI)" : "Caller"}</div>
                      {t.text}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {lead?.handoff_summary && (
            <Card title="Designer handoff" sub={lead.telegram_message_id ? "Sent on Telegram" : call.source === "replay" ? "Replay: not sent" : "Telegram in demo mode"}>
              <pre className="whitespace-pre-wrap rounded-lg bg-page p-3 font-sans text-[12.5px] leading-relaxed">{lead.handoff_summary}</pre>
              {lead.assigned_to && <p className="mt-2 text-[12.5px] text-good">✓ Taken by {lead.assigned_to}{lead.assigned_at ? ` at ${ist(lead.assigned_at, { hour: "numeric", minute: "2-digit" })}` : ""}</p>}
            </Card>
          )}

          <Card title="What happened">
            <ol className="space-y-2 text-[12.5px]">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className={e.ok ? "text-good" : "text-bad"}>{e.ok ? "✓" : "✕"}</span>
                  <div className="min-w-0">
                    <div>
                      {EVENT_LABEL[e.kind] ?? e.kind}
                      {e.detail.simulated ? <span className="text-muted"> (demo mode)</span> : null}
                    </div>
                    {typeof e.detail.error === "string" && <div className="break-words text-bad">{e.detail.error}</div>}
                    {typeof e.detail.start === "string" && <div className="text-muted">{ist(e.detail.start, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>}
                    <div className="text-[11px] text-muted">{ist(e.at, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {cost && (
            <Card title="Cost of this call">
              <dl className="space-y-1 text-[13px]">
                <div className="flex justify-between"><dt className="text-ink-2">Vaani voice ({Math.ceil(call.duration_sec / 60)} min)</dt><dd className="tnum">{inr(cost.voice_cost, 2)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Gemini ({cost.llm_input_tokens + cost.llm_output_tokens} tokens)</dt><dd className="tnum">{inr(cost.llm_cost, 3)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1 font-medium"><dt>Total</dt><dd className="tnum">{inr(cost.total_cost, 2)}</dd></div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
