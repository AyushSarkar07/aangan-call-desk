import { NextResponse } from "next/server";
import { z } from "zod";
import { processCall } from "@/lib/pipeline";
import { requireSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import { isAfterHours, parseTranscript } from "@/lib/transcript";

export const maxDuration = 60;

const Body = z.object({
  transcript: z.string().min(1).max(20_000),
  phone: z.string().max(20).optional(),
  notify: z.boolean().default(true),
});

// Runs a typed or pasted transcript through the live workflow, exactly as a Vaani call would be.
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send { transcript, phone?, notify? }" }, { status: 400 });
  const turns = parseTranscript(parsed.data.transcript);
  if (!turns.length) return NextResponse.json({ error: "No dialogue found. Use lines like 'Agent: ...' and 'Caller: ...'." }, { status: 400 });
  const words = turns.reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  const durationSec = Math.max(30, Math.round((words / 140) * 60) + turns.length * 2);
  const now = new Date();
  const start = new Date(now.getTime() - durationSec * 1000);
  const call = await getStore().insertCall({
    source: "simulator",
    vaani_event_id: null,
    vaani_call_id: null,
    caller_phone: parsed.data.phone?.replace(/[^\d+]/g, "") || null,
    start_time: start.toISOString(),
    duration_sec: durationSec,
    after_hours: isAfterHours(start),
    transcript: turns,
  });
  if (!call) return NextResponse.json({ error: "Could not store the call" }, { status: 500 });
  const result = await processCall(call.id, { notify: parsed.data.notify });
  return NextResponse.json({ ok: true, call_id: call.id, ...result });
}
