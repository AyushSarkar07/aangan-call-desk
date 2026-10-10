import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Pill, StatusChip, VerdictMark } from "@/components/ui";
import { dur, FLAG_LABEL, inr, ist } from "@/lib/format";
import { pricingLeaks } from "@/lib/transcript";
import { CRITERIA, CRITERION_LABEL, type CallRecord, type CostRecord, type EventRecord, type LeadRecord } from "@/lib/types";

const EVENT_LABEL: Record<string, string> = {
  "ai.extract": "Gemini read the transcript",
  "rubric.decide": "Nikhil's rules applied",
  "compliance.pricing": "Pricing guardrail checked",
  "dedupe.linked_dropped_call": "Merged an earlier dropped call",
  "cal.book": "Consultation booking",
  "telegram.handoff": "Handoff sent on Telegram",
  "telegram.claimed": "Designer claimed the lead",
  "hubspot.deal": "Deal created in HubSpot",
  "vaani.payload": "Vaani data checked",
};

const when = (iso: string) => ist(iso, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Vaani's own summary and recording, when the call came from Vaani. */
function vaaniExtras(raw: unknown): { summary: string | null; recording: string | null } {
  const d = (raw as { data?: { summary?: unknown; recording_url?: unknown } } | null)?.data;
  return {
    summary: typeof d?.summary === "string" ? d.summary : null,
    recording: typeof d?.recording_url === "string" && /^https:\/\//.test(d.recording_url) ? d.recording_url : null,
  };
}

function Fact({ label, children, tone }: { label: string; children: ReactNode; tone?: "good" | "warn" | "muted" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "muted" ? "text-muted" : "";
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-[13.5px] leading-snug ${color}`}>{children}</div>
    </div>
  );
}

export function CallDetail({
  call,
  lead,
  cost,
  events,
  raw,
}: {
  call: CallRecord;
  lead: LeadRecord | null;
  cost: CostRecord | null;
  events: EventRecord[];
  raw: unknown;
}) {
  const x = lead?.extraction;
  const leaks = new Set(pricingLeaks(call.transcript));
  const vaani = vaaniExtras(raw);
  const telegram = events.find((e) => e.kind === "telegram.handoff");
  const hubspot = events.find((e) => e.kind === "hubspot.deal");
  const portal = process.env.HUBSPOT_PORTAL_ID?.trim();
  const booking = lead?.booking;
  const source = call.source === "vaani" ? "Phone call (Vaani)" : call.source === "replay" ? "September enquiry (replayed)" : "Test call";

  return (
    <div className="space-y-4">
      {/* Who and when */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-[24px] leading-tight">{lead?.caller_name ?? "Unknown caller"}</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            {ist(call.start_time, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} · {dur(call.duration_sec)} · {call.caller_phone ?? "number withheld"}
            {call.after_hours && " · after hours"} · {source}
          </p>
          {(x?.summary || vaani.summary) && <p className="mt-2 max-w-2xl text-[14px]">{x?.summary ?? vaani.summary}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusChip status={call.status} />
          {lead?.priority && lead.priority !== "normal" && <Pill tone="bad">{lead.priority === "urgent" ? "Urgent" : "High priority"}</Pill>}
        </div>
      </div>

      {call.linked_call_id && (
        <div className="rounded-lg border border-line bg-card px-4 py-3 text-[13px]">
          This call dropped. The same number rang back: <Link className="text-accent" href={`/calls?id=${call.linked_call_id}`}>see the call-back</Link>.
        </div>
      )}

      {/* The outcome at a glance */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Fact label="Outcome" tone={lead?.status === "QUALIFIED" ? "good" : lead?.status === "ESCALATED" || lead?.status === "NEEDS_INFO" ? "warn" : undefined}>
          {lead ? (lead.reasons[0] ?? "Passed all five checks.") : call.error ?? "Processing…"}
        </Fact>
        <Fact label="Meeting" tone={booking?.status === "booked" ? "good" : booking ? undefined : "muted"}>
          {booking ? (
            <>
              {booking.status === "booked" ? "Booked" : booking.status === "held" ? "Slot held" : "Booking failed"}: {when(booking.start)}
              <div className="text-[12px] text-muted">
                {booking.provider === "cal.com" ? (booking.id ? <a className="text-accent" href={`https://app.cal.com/booking/${booking.id}`} target="_blank" rel="noreferrer">Open in Cal.com ↗</a> : "Cal.com") : call.source === "replay" ? "Replay: not sent to Cal.com" : "Calendar in demo mode"}
                {x?.site_visit_requested ? " · site visit" : ""}
              </div>
            </>
          ) : (
            "None (only qualified callers are booked)"
          )}
        </Fact>
        <Fact label="Designer" tone={lead?.assigned_to ? "good" : telegram ? undefined : "muted"}>
          {lead?.assigned_to
            ? <>Taken by {lead.assigned_to}{lead.assigned_at ? ` at ${ist(lead.assigned_at, { hour: "numeric", minute: "2-digit" })}` : ""}</>
            : telegram?.ok && !telegram.detail.simulated
              ? "Sent to Telegram, not claimed yet"
              : telegram?.detail.simulated
                ? "Telegram in demo mode"
                : lead?.status === "DISQUALIFIED"
                  ? "Not forwarded (not a fit)"
                  : call.source === "replay"
                    ? "Replay: not sent"
                    : "Not sent"}
        </Fact>
        <Fact label="CRM" tone={lead?.hubspot_deal_id ? "good" : "muted"}>
          {lead?.hubspot_deal_id ? (
            portal ? <a className="text-accent" href={`https://app.hubspot.com/contacts/${portal}/record/0-3/${lead.hubspot_deal_id}`} target="_blank" rel="noreferrer">HubSpot deal ↗</a> : `HubSpot deal ${lead.hubspot_deal_id}`
          ) : hubspot?.detail.simulated ? "HubSpot in demo mode" : "No deal"}
        </Fact>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* The conversation */}
        <div className="xl:col-span-3">
          <Card
            title="Conversation"
            sub={leaks.size ? "Lines in red quoted a price, which the studio forbids." : "What the caller said and how the AI replied"}
            right={vaani.recording ? <a href={vaani.recording} target="_blank" rel="noreferrer" className="text-[12.5px] text-accent">▶ Recording</a> : undefined}
          >
            {call.transcript.length === 0 ? (
              <p className="text-[13px] text-muted">No conversation (missed or dropped call).</p>
            ) : (
              <ol className="space-y-2.5">
                {call.transcript.map((t, i) => (
                  <li key={i} className={`flex ${t.speaker === "agent" ? "" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed ${leaks.has(t.text) ? "bg-bad-soft text-bad" : t.speaker === "agent" ? "bg-page" : "bg-accent-soft"}`}>
                      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.speaker === "agent" ? "Aangan AI" : "Caller"}</div>
                      {t.text}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          {lead && (
            <Card title="Nikhil's five checks" sub="The caller's own words as evidence">
              <ul className="divide-y divide-line">
                {CRITERIA.map((k) => {
                  const c = lead.criteria[k];
                  return (
                    <li key={k} className="flex gap-2 py-2 text-[13px]">
                      <VerdictMark v={c.verdict} />
                      <div>
                        <div><span className="font-medium">{CRITERION_LABEL[k]}.</span> {c.note}</div>
                        {c.evidence && <div className="mt-0.5 text-[12.5px] italic text-muted">“{c.evidence}”</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {lead.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">{lead.flags.map((f) => <Pill key={f} tone={f === "price_quoted" ? "bad" : "plain"}>{FLAG_LABEL[f] ?? f}</Pill>)}</div>
              )}
            </Card>
          )}

          {lead?.handoff_summary && (
            <Card title="Note sent to the designer">
              <pre className="whitespace-pre-wrap rounded-lg bg-page p-3 font-sans text-[12.5px] leading-relaxed">{lead.handoff_summary}</pre>
            </Card>
          )}

          <Card title="Step by step">
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
                    {typeof e.detail.start === "string" && <div className="text-muted">{when(e.detail.start)}</div>}
                    <div className="text-[11px] text-muted">{ist(e.at, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {cost && (
            <Card title="Cost of this call">
              <dl className="space-y-1 text-[13px]">
                <div className="flex justify-between"><dt className="text-ink-2">Voice ({Math.ceil(call.duration_sec / 60)} min)</dt><dd className="tnum">{inr(cost.voice_cost, 2)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">AI reading ({cost.llm_input_tokens + cost.llm_output_tokens} tokens)</dt><dd className="tnum">{inr(cost.llm_cost, 3)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1 font-medium"><dt>Total</dt><dd className="tnum">{inr(cost.total_cost, 2)}</dd></div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
