# Aangan Call Desk

AI front desk for Aangan Studio (MESA Case 03). Every inbound call is answered by a Vaani Labs voice agent, day or night.
When the call ends, Gemini Flash reads the transcript into facts, Nikhil's rubric decides in code, and qualified callers
get a consultation (Cal.com), a CRM deal (HubSpot) and a designer handoff on Telegram, with everything already asked.
The dashboard shows volume, speed, qualification, cost and expected return, computed from every call.

## Deliverables

| | Where |
|---|---|
| A. Components map (Trigger → Input → Context → Processing → AI → Output) | `/system` page, `src/app/system/page.tsx` |
| B. Schema + migration (`calls`, `leads`, `system_costs`, `events`) | `supabase/migrations/0001_init.sql` |
| C. Handoff note generator | `src/lib/handoff.ts` (`buildHandoff`, `toMarkdown`, `toTelegramHtml`) |
| Qualification rubric (qualified.md in code) | `src/lib/rubric.ts`, tests in `tests/rubric.test.ts` |
| Voice agent script + flow | `docs/VAANI_AGENT.md` |
| Accuracy against September's 20 calls | `/calibration` page, `src/fixtures/september.ts` |

## How a call flows

1. Vaani posts `call.completed` to `/api/vaani/webhook` (HMAC-verified, idempotent on event id); we reply at once and continue with `after()`.
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

Then open the dashboard and press **Replay September's calls**, or use **Test a call**.
