import "server-only";

const api = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(api(method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

export const CLAIM = "claim:";

export function chatFor(kind: "lead" | "escalation" | "callback") {
  const lead = process.env.TELEGRAM_CHAT_ID!;
  if (kind === "escalation") return process.env.TELEGRAM_ESCALATION_CHAT_ID?.trim() || lead;
  if (kind === "callback") return process.env.TELEGRAM_FRONTDESK_CHAT_ID?.trim() || lead;
  return lead;
}

/** Sends the handoff with a one-tap "I'll take this" button and a link to the full call. */
export async function sendHandoff(opts: { chatId: string; html: string; leadId: string; dashboardUrl: string; claimable: boolean }) {
  const buttons: { text: string; callback_data?: string; url?: string }[][] = [];
  if (opts.claimable) buttons.push([{ text: "✋ I'll take this", callback_data: `${CLAIM}${opts.leadId}` }]);
  if (/^https:\/\//.test(opts.dashboardUrl)) buttons.push([{ text: "Open call & transcript", url: opts.dashboardUrl }]);
  const msg = await call<{ message_id: number }>("sendMessage", {
    chat_id: opts.chatId,
    text: opts.html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
  return msg.message_id;
}

export async function markClaimed(chatId: number | string, messageId: number, by: string, dashboardUrl: string) {
  const at = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const rows = [[{ text: `✅ Taken by ${by} at ${at}`, callback_data: "noop" }]];
  if (/^https:\/\//.test(dashboardUrl)) rows.push([{ text: "Open call & transcript", url: dashboardUrl } as never]);
  await call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: rows } });
}

export const answerCallback = (id: string, text: string) => call("answerCallbackQuery", { callback_query_id: id, text });
