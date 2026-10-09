// Deliverable C: turns a processed call into the designer handoff note.
// Same content in two renderings: Markdown (stored, shown on the dashboard) and Telegram HTML.
import { CRITERIA, CRITERION_LABEL, type Booking, type Decision, type Extraction } from "./types";
import { CLARIFYING_QUESTION, lakh } from "./rubric";

export interface HandoffInput {
  phone: string | null;
  callStart: Date;
  durationSec: number;
  afterHours: boolean;
  extraction: Extraction;
  decision: Decision;
  booking: Booking | null;
  dashboardUrl?: string;
}

export interface HandoffNote {
  title: string;
  fields: [label: string, value: string][];
  checklist: string[];
  alreadyAsked: string[];
}

const fmtDate = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const titleFor = (d: Decision) =>
  d.status === "ESCALATED" ? "🚨 ESCALATION: EXISTING CLIENT" : d.status === "NEEDS_INFO" ? "📞 CALL BACK NEEDED" : d.priority === "high" ? "📌 NEW QUALIFIED LEAD (PRIORITY)" : "📌 NEW QUALIFIED LEAD HANDOFF";

export function buildHandoff(i: HandoffInput): HandoffNote {
  const x = i.extraction;
  const d = i.decision;
  const where = [x.property, x.location_text, x.carpet_area_sqft ? `${x.carpet_area_sqft.toLocaleString("en-IN")} sq ft` : null].filter(Boolean).join(", ");
  const scope = x.rooms_in_scope.length ? x.rooms_in_scope.map((s) => s[0].toUpperCase() + s.slice(1)).join(" + ") : x.project_category.replaceAll("_", " ");
  const timeline = [x.timeline_text, x.needed_by ? `complete by ${x.needed_by}` : null, x.site_status === "available_now" ? "site available now" : x.site_available_from ? `site from ${x.site_available_from}` : null]
    .filter(Boolean).join(" · ") || "Not stated";
  const budget = x.budget_volunteered ? `${x.budget_text ?? lakh(x.budget_max_inr ?? 0)} (volunteered)` : "Unspecified (not probed)";
  const dm = d.criteria.decision_maker.note;
  const notes = [x.key_notes, x.referral ? `Came via: ${x.referral}.` : null, `Decision-maker: ${dm}`].filter(Boolean).join(" ");

  let action: string;
  if (d.status === "ESCALATED") action = "Senior callback due within 15 minutes. Do not route to a junior designer.";
  else if (d.status === "NEEDS_INFO") {
    const qs = (["scope", "area", "timeline"] as const).filter((k) => d.criteria[k].verdict === "unclear").map((k) => `“${CLARIFYING_QUESTION[k]}”`);
    action = qs.length ? `Front desk to call back and ask: ${qs.join(" ")}` : `Front desk to call back: ${d.reasons.join(" ")}`;
  }
  else if (i.booking?.status === "booked") action = `Consultation booked via Cal.com for ${fmtDate(new Date(i.booking.start))}${x.site_visit_requested ? " (site visit requested)" : ""}`;
  else if (i.booking?.status === "held") action = `Consultation slot held for ${fmtDate(new Date(i.booking.start))}: confirm with the caller${i.booking.provider === "simulated" ? " (calendar in demo mode)" : ""}`;
  else action = `Book consultation: caller prefers ${x.preferred_consultation ?? "any time"}`;

  const fields: HandoffNote["fields"] = [
    ["Caller Name", x.caller_name ?? "Unknown"],
    ["Contact Number", i.phone ?? "Withheld"],
    ["Location & Property Type", where || "Not stated"],
    ["Scope", scope],
    ["Possession & Timeline", timeline],
    ["Budget Mentioned", budget],
    ["Key Notes & Vibe", notes],
    ["Action Taken", action],
  ];

  const mark = { pass: "✅", fail: "❌", unclear: "❔" } as const;
  const checklist = CRITERIA.map((k) => `${mark[d.criteria[k].verdict]} ${CRITERION_LABEL[k]}: ${d.criteria[k].note}`);

  // The whole point: the designer should not re-ask what the caller already answered.
  const alreadyAsked = [
    x.property || x.carpet_area_sqft ? "Property type and size" : null,
    x.location_text ? "Location" : null,
    x.rooms_in_scope.length ? "Rooms in scope" : null,
    x.timeline_text || x.needed_by ? "Timeline" : null,
    x.decision_maker !== "unknown" ? "Who decides" : null,
    x.pricing_asked ? "Asked about pricing: told it is covered at the consultation" : null,
  ].filter((s): s is string => Boolean(s));

  const meta = `${fmtDate(i.callStart)} · ${Math.round(i.durationSec / 60)} min${i.afterHours ? " · after hours" : ""}`;
  fields.push(["Call", meta]);
  return { title: titleFor(d), fields, checklist, alreadyAsked };
}

export function toMarkdown(n: HandoffNote): string {
  return [
    n.title,
    ...n.fields.map(([k, v]) => `- ${k}: ${v}`),
    "",
    "Rubric",
    ...n.checklist.map((c) => `- ${c}`),
    ...(n.alreadyAsked.length ? ["", `Already asked (don't re-ask): ${n.alreadyAsked.join(", ")}`] : []),
  ].join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Telegram HTML parse mode, kept well under the 4,096-character message limit. */
export function toTelegramHtml(n: HandoffNote): string {
  const html = [
    `<b>${esc(n.title)}</b>`,
    ...n.fields.map(([k, v]) => `• <b>${esc(k)}:</b> ${esc(v)}`),
    "",
    ...n.checklist.map(esc),
    ...(n.alreadyAsked.length ? ["", `<i>Already asked, don't re-ask: ${esc(n.alreadyAsked.join(", "))}</i>`] : []),
  ].join("\n");
  return html.length > 4000 ? `${html.slice(0, 3990)}…` : html;
}
