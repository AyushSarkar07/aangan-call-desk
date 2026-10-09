import { after, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { processCall } from "@/lib/pipeline";
import { getStore } from "@/lib/store";
import { isAfterHours } from "@/lib/transcript";
import { normalise, verifySignature, type VaaniEnvelope } from "@/lib/vaani";

export const maxDuration = 60;

// Trigger: Vaani posts here when a call ends. Signature-checked, idempotent on the event id,
// and answers within Vaani's 10-second timeout by doing the AI work after the response.
export async function POST(req: Request) {
  const secret = getConfig().vaaniSecret;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-vaanivoice-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let env: VaaniEnvelope;
  try {
    env = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const type = env.type ?? req.headers.get("x-vaanivoice-event") ?? "unknown";
  const store = getStore();

  if (type !== "call.completed" && type !== "call.failed") {
    // Keep pings, lead.created, usage.charged etc. so the real payload shapes can be inspected.
    await store.addEvent({ call_id: null, kind: `vaani.${type}`, ok: true, detail: { payload: raw.slice(0, 20_000) } });
    return NextResponse.json({ ok: true, ignored: type });
  }

  const n = normalise(env);
  const call = await store.insertCall({
    source: "vaani",
    vaani_event_id: n.eventId ?? req.headers.get("x-vaanivoice-delivery"),
    vaani_call_id: n.callId,
    caller_phone: n.phone,
    start_time: n.start.toISOString(),
    duration_sec: n.durationSec,
    after_hours: isAfterHours(n.start),
    transcript: type === "call.failed" ? [] : n.turns,
    raw_payload: env,
  });
  if (!call) return NextResponse.json({ ok: true, duplicate: true });
  if (n.missing.length) await store.addEvent({ call_id: call.id, kind: "vaani.payload", ok: n.missing.length < 2, detail: { missing: n.missing } });

  after(() => processCall(call.id, { notify: true }));
  return NextResponse.json({ ok: true, call_id: call.id });
}
