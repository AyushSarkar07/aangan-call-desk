import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getConfig } from "@/lib/config";
import { answerCallback, CLAIM, markClaimed } from "@/lib/integrations/telegram";
import { getStore } from "@/lib/store";

interface Update {
  callback_query?: {
    id: string;
    data?: string;
    from: { first_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
}

const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// A designer taps "I'll take this" under a handoff: the lead is assigned to them, the button
// changes for everyone in the group, and the claim time feeds the dashboard's response metric.
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const given = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || !sameSecret(given, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update = (await req.json()) as Update;
  const q = update.callback_query;
  if (!q?.data?.startsWith(CLAIM) || !q.message) {
    if (q) await answerCallback(q.id, "Already handled").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  const store = getStore();
  const lead = await store.getLead(q.data.slice(CLAIM.length));
  if (!lead) {
    await answerCallback(q.id, "Lead not found").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  const who = q.from.first_name || q.from.username || "a designer";
  const dashboardUrl = `${getConfig().appUrl}/calls/${lead.call_id}`;
  if (lead.assigned_to) {
    await answerCallback(q.id, `Already taken by ${lead.assigned_to}`).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  await store.updateLead(lead.id, { assigned_to: who, assigned_at: new Date().toISOString() });
  await store.addEvent({ call_id: lead.call_id, kind: "telegram.claimed", ok: true, detail: { by: who } });
  await markClaimed(q.message.chat.id, q.message.message_id, who, dashboardUrl).catch(() => {});
  await answerCallback(q.id, "It's yours. Caller details are in the note.").catch(() => {});
  return NextResponse.json({ ok: true });
}
