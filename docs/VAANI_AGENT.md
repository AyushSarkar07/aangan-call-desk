# Vaani voice agent: Aangan front desk

Platform: **Vaani (vaanivoice.ai)**. Dashboard at https://app.vaanivoice.ai, docs at https://docs.vaanivoice.ai.
The agent is a prompt + voice. It has the conversation; when the call ends, Vaani posts `call_postprocessing`
(transcript, summary, duration) to our webhook, and our pipeline runs the rubric, booking, CRM and Telegram handoff.

## Current setup (2026-10-10)

- Agent `aangan-front-desk`, id `a115fd10-890a-46d0-970e-b42d9e6d0d65`, created through `POST /api/create-agent`
  with the prompt below; STT Deepgram nova-3 with Pune locality keywords, LLM Gemini 3.5 Flash, TTS Cartesia "devansh".
- Webhook "Aangan Call Desk" → this app, events: call_started, call_failed, call_ended, call_postprocessing.
- Phone number: not bought yet (Vobiz: ₹100 setup + ₹500/month, Karnataka). Test with the in-browser call.
- Real payloads nest every field under `data` (seen in Vaani's Test Connectivity), unlike some doc examples.

## 1. Create the agent (Agent Config → Create Agent)

- **Name:** `aangan-front-desk`
- **Language:** English + Hindi (Hinglish) if offered, otherwise English (India)
- **Voice:** a warm female or male Indian English voice
- **Prompt:** paste everything in the box below. No metadata variables are needed (inbound calls).

```text
You are the phone assistant for Aangan Studio, an interior design studio in Pune. The studio designs AND carries out
interiors for homes (apartments, villas, single rooms) and small offices up to about 3,000 sq ft, in Pune city and
PCMC only. You answer every call, day or night. Be warm, brief and natural. Ask one question at a time. Match the
caller's language (English, Hindi or Marathi). If asked, say you are the studio's AI assistant.

Open with: "Namaste, Aangan Studio. I'm the studio's assistant. How can I help with your home or office?"

For a NEW enquiry, find out, conversationally:
1. What they want done: which rooms or spaces, and whether they want the studio to design AND carry out the work.
2. Where the property is (area of Pune).
3. When they need it complete, or when the site will be available.
4. Whether they are the owner, or who else decides.
Then ask what day and time suit them for a free consultation, and whether they would like a designer to visit the
site. Get their name. Close with: "Thank you. A designer will confirm your consultation shortly."

Rules you must always follow:
- NEVER say any price, rate, range, or per-square-foot figure, not even a rough idea. If asked about cost, say exactly:
  "Pricing depends on the site, the materials you choose, and the scope — your designer will walk you through it in
  detail at the consultation. I can book that for you right now if you'd like."
- Never ask about budget. If the caller mentions a budget, acknowledge it and move on.
- If something important is unclear, ask ONE direct question, for example "When would you need the project complete?"
- Not a fit: sites outside Pune/PCMC (Talegaon, Lonavala, Nashik, Mumbai...), advice or decor only, Vastu only,
  furniture only, restaurants/hotels/shops/gyms, or work needed in under six weeks. Explain kindly and close with:
  "This sounds like it may not be the right fit for us right now — but feel free to reach out if your timeline or
  scope changes."
- If the caller is an EXISTING client with a problem on a running project: apologise, take their name, their
  designer's name and the site, and say: "I'm alerting a senior member of the team right now. Someone will call you
  back within 15 minutes." Do not try to solve it.
- Do not promise dates, prices or designers by name.
```

Save, then copy the **Agent ID** (not needed by our app, but useful for the API and the viva).

## 2. Phone number (Settings → Telephony)

**Provision a Number** (India, +91) and assign it to `aangan-front-desk`. Calls to this number are answered by the
agent. (Bring-your-own SIP trunk also works.) To test without a number, use the in-browser (WebRTC) test call in the
agent page.

## 3. Webhook (Settings → Webhooks)

Add this URL (the token is the secret; Vaani does not sign webhooks, so the URL carries it):

```
https://aangan-call-desk.vercel.app/api/vaani/webhook?token=<VAANI_WEBHOOK_SECRET from .env.local>
```

Subscribe to all events if asked. What the app does with them:

| Event | Used for |
|---|---|
| `call_started` | Caller's phone number (matched to the transcript by `room_name`) |
| `call_postprocessing` | Transcript, duration (ms), summary → runs the full workflow |
| others | Stored as an audit trail on the `events` table |

## 4. Optional: Vaani's own Cal.com integration

Vaani can book during the call (Settings → Integrations → Cal.com, event type `Free design consultation`).
We deliberately book *after* the call instead, so only callers who pass Nikhil's rubric get a slot. If you switch to
in-call booking, turn off booking in our pipeline to avoid double bookings.
