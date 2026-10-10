# Aangan Call Desk

AI front desk for Aangan Studio (MESA Case 03). Every inbound call is answered by a Vaani (vaanivoice.ai) voice agent, day or night.
When the call ends, Gemini Flash reads the transcript into facts, Nikhil's rubric decides in code, and qualified callers
get a consultation (Cal.com), a CRM deal (HubSpot) and a designer handoff on Telegram, with everything already asked.
The dashboard shows volume, speed, qualification, cost and expected return, computed from every call.

## Deliverables

| | Where |
|---|---|
| A. Components map (Trigger → Input → Context → Processing → AI → Output) | `docs/components-map.png` / `.pdf` |
| B. Schema + migration (`calls`, `leads`, `system_costs`, `events`) | `supabase/migrations/0001_init.sql` |
| C. Handoff note generator | `src/lib/handoff.ts` (`buildHandoff`, `toMarkdown`, `toTelegramHtml`) |
| Qualification rubric (qualified.md in code) | `src/lib/rubric.ts`, tests in `tests/rubric.test.ts` |
| Voice agent script + flow | `docs/VAANI_AGENT.md` |
| September's 20 phone enquiries, with the rubric's expected outcome (replay matched 21/21) | `src/fixtures/september.ts` |
| Call log: every call's conversation, outcome, meeting, handoff and CRM deal | `/calls` page, `src/components/CallDetail.tsx` |

## How a call flows

1. Vaani posts `call_started` (caller number) and `call_postprocessing` (transcript) to `/api/vaani/webhook?token=…`; idempotent on the call id; we reply at once and continue with `after()`.
2. `extract()` (Gemini) turns the transcript into a strict JSON `Extraction`: facts and caller quotes, no decision.
3. `decide()` applies the five criteria. Any fail → decline. Unclear scope/area/timeline → call-back with one question.
   Unclear budget/decision-maker → qualified with a note. Existing client → escalate.
4. Agent lines are scanned for quoted prices (pricing.md forbids them).
5. Qualified: Cal.com booking at the caller's stated preference, HubSpot deal, Telegram note with an "I'll take this" button.
6. Voice minutes and Gemini tokens are priced into `system_costs`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in what you have; the rest runs in demo mode
node scripts/migrate.mjs     # needs DATABASE_URL
npm run dev
npm test
```

Then open the dashboard and the Call log. Live: https://aangan-call-desk.vercel.app
