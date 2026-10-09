import "server-only";
import { extract } from "./ai/extract";
import { getConfig, getRates } from "./config";
import { callCost } from "./costs";
import { buildHandoff, toMarkdown, toTelegramHtml } from "./handoff";
import { bookConsultation, simulatedBooking } from "./integrations/cal";
import { createDeal } from "./integrations/hubspot";
import { chatFor, sendHandoff } from "./integrations/telegram";
import { decide } from "./rubric";
import { getStore } from "./store";
import { pricingLeaks } from "./transcript";
import type { Booking, LeadRecord } from "./types";

export interface ProcessOptions {
  /** Send Telegram / create bookings and CRM deals. Off when bulk-replaying historical calls. */
  notify: boolean;
}

/** Runs one stored call through the whole workflow. Never throws: failures are recorded as events. */
export async function processCall(callId: string, opts: ProcessOptions = { notify: true }) {
  const store = getStore();
  const cfg = getConfig();
  const row = await store.getCall(callId);
  if (!row) throw new Error(`Call ${callId} not found`);
  const { call } = row;
  const callStart = new Date(call.start_time);
  const event = (kind: string, ok: boolean, detail: Record<string, unknown> = {}) => store.addEvent({ call_id: call.id, kind, ok, detail });

  async function step<T>(kind: string, fn: () => Promise<T>, detail: (r: T) => Record<string, unknown> = () => ({})): Promise<T | null> {
    try {
      const r = await fn();
      await event(kind, true, detail(r));
      return r;
    } catch (e) {
      await event(kind, false, { error: (e as Error).message.slice(0, 500) });
      return null;
    }
  }

  // 1. AI: transcript → structured facts.
  const ex = await step("ai.extract", () => extract(call.transcript, callStart), (r) => ({ live: r.live, model: r.usage.model, tokens: r.usage.input + r.usage.output }));
  if (!ex) {
    await store.updateCall(call.id, { status: "FAILED", error: "Extraction failed", processed_at: new Date().toISOString() });
    return { status: "FAILED" as const };
  }
  const x = ex.extraction;

  // 2. Rubric, in code.
  const decision = decide(x, callStart);
  await event("rubric.decide", true, { status: decision.status, reasons: decision.reasons });

  // 3. Compliance: the agent must never quote a price.
  const leaks = pricingLeaks(call.transcript);
  if (leaks.length) {
    decision.flags.push("price_quoted");
    await event("compliance.pricing", false, { lines: leaks });
  } else if (x.pricing_asked) {
    await event("compliance.pricing", true, { note: "Pricing asked and deflected without a figure." });
  }

  // 4. A dropped call followed by a call-back from the same number is one enquiry, not two.
  if (call.caller_phone && x.intent !== "no_conversation") {
    const earlier = await store.recentCallsFrom(call.caller_phone, new Date(callStart.getTime() - 2 * 3600e3));
    for (const e of earlier) {
      if (e.id !== call.id && e.intent === "no_conversation" && !e.linked_call_id && new Date(e.start_time) < callStart) {
        await store.updateCall(e.id, { linked_call_id: call.id });
        await event("dedupe.linked_dropped_call", true, { earlier_call: e.id });
      }
    }
  }

  // 5. Book the free consultation for qualified callers.
  let booking: Booking | null = null;
  if (decision.status === "QUALIFIED") {
    const notes = `${x.summary} ${x.key_notes}`;
    booking =
      opts.notify && cfg.cal === "live"
        ? await step("cal.book", () => bookConsultation({ name: x.caller_name ?? "Caller", phone: call.caller_phone, preference: x.preferred_consultation, notes, now: new Date() }), (b) => ({ start: b.start, id: b.id, status: b.status }))
        : simulatedBooking(x.preferred_consultation, callStart);
    if (booking && (!opts.notify || cfg.cal !== "live")) await event("cal.book", true, { simulated: true, start: booking.start });
  }

  // 6. Handoff note (Deliverable C).
  const note = buildHandoff({ phone: call.caller_phone, callStart, durationSec: call.duration_sec, afterHours: call.after_hours, extraction: x, decision, booking });
  const markdown = toMarkdown(note);

  const leadBase: Omit<LeadRecord, "id" | "created_at"> = {
    call_id: call.id,
    caller_name: x.caller_name,
    project_type: x.project_category,
    scope: x.rooms_in_scope.join(", ") || null,
    location: x.location_text,
    zone: decision.zone,
    carpet_area: x.carpet_area_sqft != null ? Math.round(x.carpet_area_sqft) : null,
    timeline: x.timeline_text,
    needed_by: x.needed_by && !Number.isNaN(Date.parse(x.needed_by)) ? x.needed_by : null,
    budget: x.budget_volunteered ? x.budget_text : null,
    budget_max_inr: x.budget_max_inr != null ? Math.round(x.budget_max_inr) : null,
    decision_maker: x.decision_maker,
    status: decision.status,
    priority: decision.priority,
    criteria: decision.criteria,
    reasons: decision.reasons,
    flags: decision.flags,
    handoff_summary: decision.status === "DISQUALIFIED" ? null : markdown,
    booking,
    hubspot_deal_id: null,
    telegram_message_id: null,
    handoff_sent_at: null,
    assigned_to: null,
    assigned_at: null,
    extraction: x,
  };
  const lead = await store.insertLead(leadBase);
  const dashboardUrl = `${cfg.appUrl}/calls/${call.id}`;

  // 7. Designer handoff on Telegram.
  if (decision.status !== "DISQUALIFIED" && opts.notify) {
    const chat = decision.status === "ESCALATED" ? chatFor("escalation") : decision.status === "NEEDS_INFO" ? chatFor("callback") : chatFor("lead");
    if (cfg.telegram === "live") {
      const msgId = await step("telegram.handoff", () => sendHandoff({ chatId: chat, html: toTelegramHtml(note), leadId: lead.id, dashboardUrl, claimable: true }), (id) => ({ message_id: id, chat }));
      if (msgId) await store.updateLead(lead.id, { telegram_message_id: msgId, handoff_sent_at: new Date().toISOString() });
    } else {
      await event("telegram.handoff", true, { simulated: true });
      await store.updateLead(lead.id, { handoff_sent_at: new Date().toISOString() });
    }
  } else if (decision.status !== "DISQUALIFIED") {
    // Replays: record when the handoff would have gone out (processing is the only delay).
    await store.updateLead(lead.id, { handoff_sent_at: new Date(callStart.getTime() + call.duration_sec * 1000 + 8000).toISOString() });
  }

  // 8. CRM.
  if (decision.status === "QUALIFIED" && opts.notify) {
    if (cfg.hubspot === "live") {
      const dealId = await step(
        "hubspot.deal",
        () => createDeal({
          name: x.caller_name ?? `Caller ${call.caller_phone ?? ""}`.trim(),
          phone: call.caller_phone,
          dealName: `${x.caller_name ?? "New lead"}: ${[x.property, x.location_text].filter(Boolean).join(", ") || "Interior project"}`,
          amountInr: null,
          stage: booking?.status === "booked" ? "appointmentscheduled" : "qualifiedtobuy",
          description: markdown,
        }),
        (id) => ({ deal_id: id }),
      );
      if (dealId) await store.updateLead(lead.id, { hubspot_deal_id: dealId });
    } else {
      await event("hubspot.deal", true, { simulated: true });
    }
  }

  // 9. What this call cost to handle.
  await store.insertCost(callCost(call.id, call.duration_sec, ex.usage, getRates()));
  await store.updateCall(call.id, { status: decision.status, intent: x.intent, processed_at: new Date().toISOString(), error: null });
  return { status: decision.status, leadId: lead.id };
}
