import Link from "next/link";
import { Bars, DailyOutcomes } from "@/components/charts";
import { CallsTable } from "@/components/CallsTable";
import { PeriodTabs } from "@/components/PeriodTabs";
import { Card, Pill, Stat } from "@/components/ui";
import { getRates } from "@/lib/config";
import { inr, inrCompact, pct, secs } from "@/lib/format";
import { CRITERIA, CRITERION_LABEL } from "@/lib/types";
import { loadPeriod, modes, type Period } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const period = (["all", "live", "replay"].includes(String(sp.p)) ? sp.p : "all") as Period;
  const { rows, metrics: m, hasAny } = await loadPeriod(period);
  const rates = getRates();

  if (!hasAny) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-serif text-[30px] leading-tight">Every enquiry answered, day or night.</h1>
        <p className="mt-3 text-[14px] text-ink-2">No calls yet. Calls appear here as soon as the AI front desk answers them.</p>
      </div>
    );
  }

  const queue = rows.filter((r) => r.lead && r.lead.status !== "DISQUALIFIED" && !r.lead.assigned_to && !r.call.linked_call_id && r.call.source !== "replay");
  const fails = CRITERIA.map((k) => ({ label: CRITERION_LABEL[k], value: m.fails[k] })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[28px] leading-tight">Every call answered.</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            What the AI front desk handled, what it qualified, and what it cost. Updated on every call.
          </p>
        </div>
        <PeriodTabs current={period} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {modes().map((x) => (
          <Pill key={x.name} tone={x.live ? "info" : "plain"}>
            {x.live ? "●" : "○"}&nbsp;{x.name}{x.detail ? `: ${x.detail}` : x.live ? "" : ": demo mode"}
          </Pill>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Calls answered" value={pct(m.answeredPct)} note={<>{m.answered} of {m.total} calls. Before: ~48% of enquiries had no reply in 48 h.</>} tone={m.answeredPct >= 0.99 ? "good" : undefined} />
        <Stat label="Call ends → designer has it" value={secs(m.medianHandoffSec)} note="Median. Before: next day, as a forwarded message with no context." />
        <Stat label="Qualified leads" value={m.qualified} note={<>{pct(m.qualifiedRate)} of {m.enquiries} real enquiries</>} />
        <Stat label="After-hours calls" value={m.afterHours} note={<>{pct(m.afterHoursPct)} of calls; {m.afterHoursQualified} qualified that the desk would have missed</>} />
        <Stat label="Cost to run" value={inr(m.cost.total, m.cost.total < 100 ? 2 : 0)} note={<>{inr(m.cost.perCall, 2)} per call · {m.cost.perQualified != null ? inr(m.cost.perQualified, 2) : "—"} per qualified lead</>} />
        <Stat label="Expected revenue" value={inrCompact(m.value.expectedRevenue)} note={<>{m.booked} consultations × {pct(rates.consultToProjectRate)} close × {inrCompact(rates.avgProjectValueInr)}{m.value.roi ? ` · ${Math.round(m.value.roi).toLocaleString("en-IN")}× cost` : ""}</>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Calls per day, by outcome" sub="Dropped calls that were rung back count once." className="lg:col-span-2">
          <DailyOutcomes days={m.daily} />
        </Card>
        <Card title="From call to designer" sub="Each stage as a count of calls">
          <Bars
            rows={[
              { label: "Calls received", value: m.total },
              { label: "Real project enquiries", value: m.enquiries, note: "Excludes existing clients, dropped calls and wrong numbers." },
              { label: "Qualified on all 5 criteria", value: m.qualified },
              { label: "Consultation booked or held", value: m.booked },
              { label: "Claimed by a designer on Telegram", value: m.claimed, note: m.medianClaimMin != null ? `Median ${m.medianClaimMin.toFixed(0)} min from handoff to claim.` : "Replayed calls are not sent to Telegram." },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Why calls were not a fit" sub={`${m.byStatus.DISQUALIFIED} declined politely. A call can fail more than one criterion.`}>
          <Bars rows={fails} />
        </Card>
        <Card title="Pricing guardrail" sub="pricing.md: never quote a number on the call">
          <div className="flex items-baseline gap-2">
            <span className={`text-[34px] font-semibold ${m.priceLeaks ? "text-bad" : "text-good"}`}>{m.priceLeaks}</span>
            <span className="text-[13px] text-ink-2">calls where the agent said a figure</span>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-2">
            {m.pricingAsked} callers asked about price. Each got the deflection and an offer to book, and none was disqualified for asking. Every agent line is scanned after each call.
          </p>
          <p className="mt-3 border-t border-line pt-3 text-[12px] text-muted">
            This is the Cut: Nikhil asked for per-sq-ft quotes on the call. His own pricing guide forbids it, because prices vary by site.
          </p>
        </Card>
        <Card title="What it costs" sub="Measured per call, not estimated">
          <dl className="space-y-1.5 text-[13px]">
            <Row k="Voice minutes (Vaani)" v={`${inr(m.cost.voice, 2)} · ${m.cost.minutes} min`} />
            <Row k="AI reading calls (Gemini)" v={`${inr(m.cost.llm, 2)} · ${(m.cost.tokens / 1000).toFixed(1)}k tokens`} />
            <Row k="Telegram, Cal.com, HubSpot, hosting" v={rates.fixedMonthlyInr ? `${inr(rates.fixedMonthlyInr)}/mo` : "Free tiers"} />
            <div className="my-2 border-t border-line" />
            <Row k={`At ${rates.enquiriesPerMonth} enquiries / month`} v={<b>{inr(m.cost.monthlyRun)}/mo</b>} />
            <Row k="One project won pays for" v={m.cost.monthlyRun > 0 ? `${Math.floor(rates.avgProjectValueInr / m.cost.monthlyRun).toLocaleString("en-IN")} months` : "—"} />
          </dl>
        </Card>
      </div>

      {queue.length > 0 && (
        <Card title="Waiting on someone" sub="Live leads and call-backs that no designer has claimed yet">
          <CallsTable rows={queue.slice(0, 8)} compact />
        </Card>
      )}

      <Card title="Recent calls" right={<Link href="/calls" className="text-[12.5px] text-accent">Call log →</Link>}>
        <CallsTable rows={rows.slice(0, 10)} />
      </Card>

      <p className="text-[11.5px] text-muted">
        Assumptions (set in the environment): average project {inrCompact(rates.avgProjectValueInr)} (brief: ₹8–14 lakh), {pct(rates.consultToProjectRate)} of consultations become projects, Vaani at {inr(rates.vaaniInrPerMin, 2)}/min.
        Expected revenue is a projection, not booked revenue.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-2">{k}</dt>
      <dd className="tnum text-right">{v}</dd>
    </div>
  );
}
