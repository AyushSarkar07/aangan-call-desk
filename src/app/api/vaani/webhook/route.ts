import { after, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { processCall } from "@/lib/pipeline";
import { getStore } from "@/lib/store";
import { isAfterHours } from "@/lib/transcript";
import { normalisePostprocessing, phoneOf, roomOf, tokenMatches, type VaaniEvent } from "@/lib/vaani";

export const maxDuration = 60;

// Trigger: Vaani (vaanivoice.ai) posts call lifecycle events here. call_started carries the caller's
// number; call_postprocessing carries the transcript, so that is when the workflow runs.
// The registered URL includes ?token=<VAANI_WEBHOOK_SECRET> (Vaani signing is optional and undocumented).
export async function POST(req: Request) {
  const secret = getConfig().vaaniSecret;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  const url = new URL(req.url);
  if (!tokenMatches(url.searchParams.get("token") ?? req.headers.get("x-webhook-token"), secret)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  let e: VaaniEvent;
  try {
    e = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const store = getStore();
  const type = e.event ?? "unknown";
  const room = roomOf(e);

  if (type !== "call_postprocessing") {
    // Keep every lifecycle event: call_started gives us the caller's number, the rest are an audit trail.
    await store.addEvent({
      call_id: null,
      kind: `vaani.${type}`,
      ok: !/failed|rejected/.test(type),
      detail: { room_name: room, phone_number: phoneOf(e), payload: e },
    });
    return NextResponse.json({ ok: true, stored: type });
  }

  const n = normalisePostprocessing(e);
  const phone = n.phone ?? (await store.phoneForRoom(n.room));
  const call = await store.insertCall({
    source: "vaani",
    vaani_event_id: `postprocessing:${n.callId}`,
    vaani_call_id: n.callId,
    caller_phone: phone,
    start_time: n.start.toISOString(),
    duration_sec: n.durationSec,
    after_hours: isAfterHours(n.start),
    transcript: n.turns,
    raw_payload: e,
  });
  if (!call) return NextResponse.json({ ok: true, duplicate: true });
  const missing = [!n.turns.length && "transcript", !phone && "caller_phone", !n.durationSec && "duration"].filter(Boolean);
  if (missing.length) await store.addEvent({ call_id: call.id, kind: "vaani.payload", ok: missing.length < 2, detail: { missing } });

  after(() => processCall(call.id, { notify: true }));
  return NextResponse.json({ ok: true, call_id: call.id });
}
