import { NextResponse } from "next/server";
import { SEPTEMBER } from "@/fixtures/september";
import { processCall } from "@/lib/pipeline";
import { requireSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import { isAfterHours } from "@/lib/transcript";

export const maxDuration = 300;

// Replays the 20 September phone enquiries through the real pipeline (Gemini + rubric), without
// sending Telegram messages, bookings or CRM deals. Re-running replaces the previous replay.
export async function POST() {
  const denied = await requireSession();
  if (denied) return denied;
  const store = getStore();
  await store.deleteBySource("replay");
  const results: { ref: string; status: string }[] = [];
  // Calls from the same number run in order (so a dropped call links to its call-back);
  // different callers run in parallel to stay inside the function time limit.
  const chains = new Map<string, typeof SEPTEMBER>();
  for (const f of SEPTEMBER) chains.set(f.phone, [...(chains.get(f.phone) ?? []), f]);
  const queue = [...chains.values()];
  const worker = async () => {
    for (let chain = queue.shift(); chain; chain = queue.shift()) for (const f of chain) await replayOne(f);
  };
  async function replayOne(f: (typeof SEPTEMBER)[number]) {
    const start = new Date(f.start);
    const call = await store.insertCall({
      source: "replay",
      vaani_event_id: null,
      vaani_call_id: `replay:${f.ref}`,
      caller_phone: f.phone,
      start_time: start.toISOString(),
      duration_sec: f.durationSec,
      after_hours: isAfterHours(start),
      transcript: f.turns,
    });
    if (!call) return;
    const r = await processCall(call.id, { notify: false });
    results.push({ ref: f.ref, status: r.status });
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  results.sort((a, b) => a.ref.localeCompare(b.ref));
  return NextResponse.json({ ok: true, results });
}
