import type { Speaker, Turn } from "./types";

const AGENT = /^(agent|bot|assistant|ai|vaani|vikash|front ?desk|aangan|receptionist|system)$/i;
const CALLER = /^(user|caller|customer|human|client|lead|prospect)$/i;

const speakerOf = (label: string): Speaker | null => (AGENT.test(label.trim()) ? "agent" : CALLER.test(label.trim()) ? "caller" : null);

/** Accepts "Agent: ..." / "Caller: ..." text, or an array of {role|speaker, text|content|message}. */
export function parseTranscript(input: unknown): Turn[] {
  if (Array.isArray(input)) {
    return input
      .map((t) => {
        if (!t || typeof t !== "object") return null;
        const o = t as Record<string, unknown>;
        const label = String(o.speaker ?? o.role ?? o.from ?? o.author ?? "");
        const text = String(o.text ?? o.content ?? o.message ?? o.transcript ?? "").trim();
        if (!text) return null;
        return { speaker: speakerOf(label) ?? (/user|caller/i.test(label) ? "caller" : "agent"), text } as Turn;
      })
      .filter((t): t is Turn => t !== null);
  }
  if (typeof input !== "string") return [];
  const turns: Turn[] = [];
  for (const raw of input.split(/\r?\n/)) {
    // Vaani prefixes each turn with a timestamp: "[13:33:14] AGENT: ..."
    const line = raw.trim().replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, "");
    if (!line) continue;
    const m = line.match(/^\*{0,2}([A-Za-z ]{2,20})\*{0,2}\s*:\s*(.*)$/);
    const sp = m ? speakerOf(m[1]) : null;
    if (m && sp) turns.push({ speaker: sp, text: m[2].trim() });
    else if (turns.length) turns[turns.length - 1].text += ` ${line}`;
    else turns.push({ speaker: "caller", text: line });
  }
  return turns.filter((t) => t.text);
}

export const transcriptText = (turns: Turn[]) =>
  turns.map((t) => `${t.speaker === "agent" ? "Agent" : "Caller"}: ${t.text}`).join("\n");

/** Front desk hours are 10:00-19:00 IST; anything else was going unanswered before this system. */
export function isAfterHours(d: Date): boolean {
  const ist = new Date(d.getTime() + 5.5 * 3600e3);
  const h = ist.getUTCHours();
  const day = ist.getUTCDay();
  return h < 10 || h >= 19 || day === 0;
}

/**
 * pricing.md: the agent must never say a number, range or per-sq-ft figure.
 * Scans the agent's turns for money figures. Repeating back a number the caller already said
 * ("1 to 1.5 lakh would be below...") is not a quote, so those are ignored.
 */
export function pricingLeaks(turns: Turn[]): string[] {
  const money = /(₹\s*\d[\d,.]*|\b(?:rs\.?|inr|rupees?)\s*\d[\d,.]*|\d[\d,.]*\s*(?:lakh|lac|lakhs|k\b|thousand|crore|rupees?)|\d[\d,.]*\s*(?:\/|per)\s*(?:sq|square))/gi;
  const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));
  const leaks: string[] = [];
  const said = new Set<string>();
  for (const t of turns) {
    if (t.speaker === "caller") {
      nums(t.text).forEach((n) => said.add(n));
      continue;
    }
    const figures = t.text.match(money) ?? [];
    if (figures.some((f) => nums(f).some((n) => !said.has(n)))) leaks.push(t.text);
  }
  return leaks;
}
