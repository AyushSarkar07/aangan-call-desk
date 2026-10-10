import { Card, Pill } from "@/components/ui";
import { getConfig, getRates } from "@/lib/config";
import { inr } from "@/lib/format";
import { DECLINE_LINE } from "@/lib/rubric";

export const dynamic = "force-dynamic";

type Item = { name: string; tool: string; detail: string; live?: boolean };
type Stage = { key: string; title: string; question: string; items: Item[] };

export default function SystemPage() {
  const c = getConfig();
  const r = getRates();
  const stages: Stage[] = [
    {
      key: "trigger", title: "Trigger", question: "What starts it?",
      items: [
        { name: "Inbound call, any hour", tool: "Vaani (vaanivoice.ai)", detail: "AI agent on a provisioned number picks up within seconds, 24/7. No more 10am–7pm only.", live: Boolean(c.vaaniSecret) },
        { name: "Call ends → webhook", tool: "call_started + call_postprocessing", detail: "Secret token in the URL (Vaani doesn't sign webhooks), de-duplicated on the call id, answered at once; the AI work runs after the response." },
      ],
    },
    {
      key: "input", title: "Input", question: "What data comes in?",
      items: [
        { name: "Transcript", tool: "Vaani payload", detail: "Timestamped AGENT / USER turns from call_postprocessing, plus Vaani's own summary." },
        { name: "Call metadata", tool: "Vaani payload", detail: "Caller number (from call_started, matched by room), duration (ms), start time. After-hours computed in IST." },
      ],
    },
    {
      key: "context", title: "Context", question: "What does it need to know?",
      items: [
        { name: "Nikhil's rubric", tool: "qualified.md → rubric.ts", detail: "5 criteria, boundary rules, the decline line." },
        { name: "Services & area", tool: "services.md", detail: "What the studio does and doesn't do; Pune + PCMC localities." },
        { name: "Pricing floor (internal)", tool: "pricing.md", detail: "Used only to spot impossible volunteered budgets. Never spoken." },
        { name: "Caller history", tool: "Postgres", detail: "Same number in the last 2 h? A dropped call and its call-back merge into one lead." },
      ],
    },
    {
      key: "processing", title: "Processing", question: "What rules run?",
      items: [
        { name: "Rubric engine", tool: "TypeScript (deterministic)", detail: "Any fail → decline. Unclear on scope/area/timeline → call back with one question. Unclear on budget/decision-maker → qualify, note it." },
        { name: "Pricing guardrail", tool: "Compliance scan", detail: "Every agent line checked for figures after each call; violations flagged on the dashboard." },
        { name: "Cost meter", tool: "Postgres", detail: "Voice minutes + Gemini tokens priced per call into system_costs.", live: c.db === "postgres" },
      ],
    },
    {
      key: "ai", title: "AI", question: "Where is judgment needed?",
      items: [
        { name: "Voice conversation", tool: "Vaani agent (prompt + voice)", detail: "Greets, asks the 5 questions naturally, deflects pricing with the script, Hinglish/Marathi aware." },
        { name: "Fact extraction", tool: `Gemini Flash (${c.ai === "gemini" ? c.geminiModel : "not configured"})`, detail: "Transcript → strict JSON: scope, locality, dates, volunteered budget, decision-maker, quotes as evidence. Facts only; it does not decide.", live: c.ai === "gemini" },
      ],
    },
    {
      key: "output", title: "Output", question: "What happens next?",
      items: [
        { name: "Designer handoff", tool: "Telegram bot", detail: "Note with everything already asked + “I'll take this” button. Escalations to the studio head.", live: c.telegram === "live" },
        { name: "Consultation", tool: "Cal.com", detail: "First free slot matching the caller's stated preference.", live: c.cal === "live" },
        { name: "Deal", tool: "HubSpot CRM", detail: "Contact + deal at “Appointment scheduled”.", live: c.hubspot === "live" },
        { name: "Dashboard", tool: "Next.js on Vercel", detail: "Volume, speed, qualification, cost and return, live." },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[26px]">How it works</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-ink-2">
          Nikhil&apos;s ask: every enquiry answered in five minutes, day or night, and the good ones reaching a designer with everything already asked.
          Scope of this build: incoming phone calls only.
        </p>
      </div>

      <section aria-label="Components map">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stages.map((s, i) => (
            <div key={s.key} className="relative flex flex-col rounded-xl border border-line bg-card p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">{i + 1}. {s.title}</span>
                {i < stages.length - 1 && <span aria-hidden className="hidden text-muted xl:inline">→</span>}
              </div>
              <div className="mb-2 text-[12px] text-muted">{s.question}</div>
              <ul className="space-y-2">
                {s.items.map((it) => (
                  <li key={it.name} className="rounded-lg bg-page p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium leading-snug">{it.name}</span>
                      {it.live !== undefined && <span title={it.live ? "Connected" : "Demo mode"} className={`mt-1 h-2 w-2 shrink-0 rounded-full ${it.live ? "bg-good" : "border border-line-strong"}`} />}
                    </div>
                    <div className="text-[11.5px] font-medium text-accent">{it.tool}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-ink-2">{it.detail}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-muted">● connected · ○ demo mode (simulated and labelled as such)</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Decision matrix" sub="qualified.md, implemented in src/lib/rubric.ts and covered by tests">
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-line">
              {[
                ["Existing client with a problem", "Escalate. Studio head on Telegram, callback within 15 min.", "bad"],
                ["Any criterion fails", "Decline politely, don't forward. Two or more fails use the standard line.", "plain"],
                ["Scope, area or timeline unclear", "Agent asks one direct question. Still unclear → front-desk call-back.", "warn"],
                ["Budget or decision-maker unclear", "Qualify. Uncertainty written into the handoff.", "good"],
                ["Asks for pricing", "Scripted deflection + offer to book. Never a disqualifier.", "good"],
                ["Call drops, same number rings back", "Merged into one lead.", "plain"],
              ].map(([k, v, t]) => (
                <tr key={k}>
                  <td className="py-2 pr-3 align-top font-medium">{k}</td>
                  <td className={`py-2 align-top ${t === "bad" ? "text-bad" : t === "warn" ? "text-warn" : t === "good" ? "text-good" : "text-ink-2"}`}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-md bg-page p-2.5 text-[12px] italic text-ink-2">“{DECLINE_LINE}”</p>
        </Card>

        <Card title="Why Telegram, not email" sub="The designer handoff channel">
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-ink-2">
            <li><b className="text-ink">Speed is the product.</b> Answered within an hour converts 4× better than next day. A Telegram push lands on the designer&apos;s phone in seconds; email waits to be opened.</li>
            <li><b className="text-ink">One tap to own it.</b> “I&apos;ll take this” assigns the lead and updates the message for the whole team, so two designers never call the same person. Email can&apos;t do that.</li>
            <li><b className="text-ink">Escalations are urgent.</b> A complaint needs a senior on the phone in 15 minutes.</li>
            <li><b className="text-ink">Free, and already on their phones.</b> No inbox rules, no spam folder.</li>
            <li><b className="text-ink">The record still exists.</b> Every note is stored in Postgres and HubSpot, which covers what email would have given.</li>
          </ul>
        </Card>

        <Card title="The Cut" sub="What Nikhil asked for that a check stops us building">
          <p className="text-[13px] text-ink-2">
            Nikhil wants the system to “quote our standard per-square-foot pricing so people don&apos;t have to wait for that”. His own pricing guide says the opposite:
            no number should be quoted, because cost depends on site, materials and scope. A wrong number on the phone sets an expectation the designer then has to undo.
            The agent uses the scripted deflection and books the consultation. pricing.md is used internally only, to catch obviously impossible volunteered budgets,
            and every call is scanned to prove no figure was said.
          </p>
        </Card>

        <Card title="When things go wrong">
          <ul className="space-y-1.5 text-[13px] text-ink-2">
            <li><b className="text-ink">Vaani retries a webhook:</b> same event id, stored once.</li>
            <li><b className="text-ink">Gemini returns bad JSON:</b> one retry with the validation error, then the call is marked Failed and shown on the dashboard. Nothing is silently dropped.</li>
            <li><b className="text-ink">Telegram, Cal.com or HubSpot is down:</b> each step is isolated and logged on the call; the rest still runs.</li>
            <li><b className="text-ink">Missed or dropped call:</b> goes to the call-back queue, and merges with the call-back if the caller rings again.</li>
            <li><b className="text-ink">Payload missing fields:</b> flagged on the call, raw payload kept for inspection.</li>
          </ul>
        </Card>

        <Card title="Unit economics">
          <ul className="space-y-1 text-[13px] text-ink-2">
            <li>Vaani voice: {inr(r.vaaniInrPerMin, 2)} per started minute, as estimated on the Vaani agent page (VAANI_INR_PER_MIN).</li>
            <li>Gemini Flash: ${r.geminiUsdPerMInput} / ${r.geminiUsdPerMOutput} per million input / output tokens.</li>
            <li>Telegram, Cal.com (free plan), HubSpot (free CRM), Supabase (free), Vercel (Hobby): ₹0.</li>
            <li>A typical 5-minute call costs about {inr(5 * r.vaaniInrPerMin + 0.2, 0)}. 200 calls a month is about {inr(200 * (5 * r.vaaniInrPerMin + 0.2))}.</li>
          </ul>
        </Card>

        <Card title="Extending to WhatsApp and the web form" sub="Out of scope for this build">
          <p className="text-[13px] text-ink-2">
            Everything after the trigger is channel-agnostic: the pipeline takes a list of turns. A WhatsApp Business webhook or the website form would post the thread or form
            fields in the same shape, and the rubric, handoff, booking, CRM and dashboard work unchanged. The September WhatsApp and form enquiries (W01–W10, F01–F10) are ready to replay as the first test.
          </p>
        </Card>
      </div>

      <Card title="Endpoints">
        <ul className="space-y-1 font-mono text-[12.5px]">
          <li>POST {c.appUrl}/api/vaani/webhook <Pill>Vaani: call_started, call_postprocessing (?token=…)</Pill></li>
          <li>POST {c.appUrl}/api/telegram/webhook <Pill>Telegram: designer claims a lead</Pill></li>
          <li>POST {c.appUrl}/api/simulate <Pill>Test a call</Pill></li>
          <li>POST {c.appUrl}/api/replay <Pill>Replay September</Pill></li>
        </ul>
      </Card>
    </div>
  );
}
