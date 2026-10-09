import { CRITERIA, type Criterion, type LeadStatus } from "./types";
import type { CallRow } from "./store/types";

export interface MetricsRates {
  avgProjectValueInr: number;
  consultToProjectRate: number;
  enquiriesPerMonth: number;
  fixedMonthlyInr: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const ENQUIRY_INTENTS = new Set(["new_project_enquiry", "follow_up_on_unanswered_enquiry"]);

export function computeMetrics(rows: CallRow[], rates: MetricsRates) {
  const calls = rows.filter((r) => r.call.status !== "PROCESSING");
  const total = calls.length;
  const answered = calls.filter((r) => r.call.duration_sec > 0).length;
  const afterHours = calls.filter((r) => r.call.after_hours).length;
  const afterHoursQualified = calls.filter((r) => r.call.after_hours && r.lead?.status === "QUALIFIED").length;

  const byStatus: Record<LeadStatus | "FAILED", number> = { QUALIFIED: 0, NEEDS_INFO: 0, DISQUALIFIED: 0, ESCALATED: 0, FAILED: 0 };
  for (const r of calls) {
    // A dropped call that the same caller rang back about is one enquiry: count the call-back only.
    if (r.call.linked_call_id) continue;
    const s = r.call.status === "FAILED" ? "FAILED" : r.lead?.status;
    if (s) byStatus[s]++;
  }
  const enquiries = calls.filter((r) => r.call.intent && ENQUIRY_INTENTS.has(r.call.intent)).length;
  const qualified = byStatus.QUALIFIED;

  const fails: Record<Criterion, number> = { scope: 0, area: 0, timeline: 0, budget: 0, decision_maker: 0 };
  for (const r of calls) {
    if (r.lead?.status !== "DISQUALIFIED") continue;
    for (const k of CRITERIA) if (r.lead.criteria[k]?.verdict === "fail") fails[k]++;
  }

  const handoffSecs: number[] = [];
  const claimMins: number[] = [];
  for (const r of calls) {
    const l = r.lead;
    if (!l?.handoff_sent_at) continue;
    const end = new Date(r.call.start_time).getTime() + r.call.duration_sec * 1000;
    handoffSecs.push(Math.max(0, (Date.parse(l.handoff_sent_at) - end) / 1000));
    if (l.assigned_at) claimMins.push(Math.max(0, (Date.parse(l.assigned_at) - Date.parse(l.handoff_sent_at)) / 60000));
  }

  const booked = calls.filter((r) => r.lead?.booking && r.lead.booking.status !== "failed").length;
  const priceLeaks = calls.filter((r) => r.lead?.flags.includes("price_quoted")).length;
  const pricingAsked = calls.filter((r) => r.lead?.flags.includes("asked_pricing")).length;

  const voice = sum(calls.map((r) => r.cost?.voice_cost ?? 0));
  const llm = sum(calls.map((r) => r.cost?.llm_cost ?? 0));
  const cost = voice + llm;
  const minutes = sum(calls.map((r) => Math.ceil(r.call.duration_sec / 60)));
  const tokens = sum(calls.map((r) => (r.cost?.llm_input_tokens ?? 0) + (r.cost?.llm_output_tokens ?? 0)));
  const perCall = total ? cost / total : 0;
  const monthlyRun = perCall * rates.enquiriesPerMonth + rates.fixedMonthlyInr;

  const pipelineValue = qualified * rates.avgProjectValueInr;
  const expectedProjects = booked * rates.consultToProjectRate;
  const expectedRevenue = expectedProjects * rates.avgProjectValueInr;

  // Daily volume for the chart, oldest first.
  const days = new Map<string, Record<LeadStatus, number>>();
  for (const r of calls) {
    if (!r.lead || r.call.linked_call_id) continue;
    const d = new Date(new Date(r.call.start_time).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const row = days.get(d) ?? { QUALIFIED: 0, NEEDS_INFO: 0, DISQUALIFIED: 0, ESCALATED: 0 };
    row[r.lead.status]++;
    days.set(d, row);
  }
  const daily = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));

  return {
    total,
    answered,
    answeredPct: total ? answered / total : 0,
    afterHours,
    afterHoursPct: total ? afterHours / total : 0,
    afterHoursQualified,
    byStatus,
    enquiries,
    qualified,
    qualifiedRate: enquiries ? qualified / enquiries : 0,
    booked,
    fails,
    medianHandoffSec: median(handoffSecs),
    medianClaimMin: median(claimMins),
    claimed: claimMins.length,
    pricingAsked,
    priceLeaks,
    cost: { total: cost, voice, llm, perCall, perQualified: qualified ? cost / qualified : null, minutes, tokens, monthlyRun },
    value: { pipelineValue, expectedProjects, expectedRevenue, roi: cost > 0 ? expectedRevenue / cost : null },
    daily,
  };
}
export type Metrics = ReturnType<typeof computeMetrics>;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
