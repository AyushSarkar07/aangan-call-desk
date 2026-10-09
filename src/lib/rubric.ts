// Nikhil's qualification rubric (qualified.md), applied in code so every decision is repeatable
// and explainable. Gemini only extracts facts; nothing here is a model judgement call.
import type { Criterion, CriterionResult, Decision, Extraction, LeadStatus } from "./types";

// services.md: Pune city and PCMC, plus adjoining areas.
const PUNE = [
  "pune", "kothrud", "baner", "aundh", "koregaon park", "kalyani nagar", "viman nagar", "hadapsar", "magarpatta",
  "cybercity", "nibm", "kondhwa", "undri", "shivane", "warje", "erandwane", "deccan", "kharadi", "nanded city",
  "sinhagad road", "bavdhan", "pashan", "balewadi", "sus", "model colony", "shivajinagar", "camp", "wanowrie",
  "fatima nagar", "mundhwa", "yerawada", "dhanori", "lohegaon", "karve nagar", "bibwewadi", "katraj", "dhayari",
  "ambegaon", "sunderban", "dahanukar", "boat club", "sopan baug", "salunke vihar", "keshav nagar", "sadashiv peth",
  "narayan peth", "prabhat road", "law college road", "senapati bapat", "mohammadwadi", "pisoli", "manjri",
];
const PCMC = [
  "pcmc", "pimpri", "chinchwad", "pimple saudagar", "pimple nilakh", "pimple gurav", "ravet", "hinjewadi", "wakad",
  "tathawade", "punawale", "akurdi", "nigdi", "moshi", "bhosari", "chikhali", "pradhikaran", "kalewadi", "rahatani",
  "thergaon", "sangvi", "marunji", "maan",
];
// Named as out of area in services.md / qualified.md, plus other cities callers mention.
const OUTSIDE = [
  "talegaon", "lonavala", "nashik", "mumbai", "thane", "navi mumbai", "panvel", "khandala", "satara", "kolhapur",
  "nagpur", "aurangabad", "sambhajinagar", "chakan", "shirur", "baramati", "alibaug", "bangalore", "bengaluru",
  "hyderabad", "goa", "delhi", "gurgaon", "noida",
];

const has = (text: string, list: string[]) => list.find((p) => new RegExp(`\\b${p}\\b`, "i").test(text));

// pricing.md — INTERNAL ONLY. Used to spot volunteered budgets that are clearly impossible.
// Never rendered to callers or sent to the voice agent.
const FLOOR_PER_SQFT_RESIDENTIAL = 1800;
const FLOOR_PER_SQFT_COMMERCIAL = 1200;
const FLOOR_SINGLE_ROOM = 350_000;
const BHK_TYPICAL_SQFT: Record<string, number> = { "1": 450, "2": 850, "3": 1100, "4": 1800, "5": 2600 };
/** A volunteered budget below this share of the cheapest plausible cost is "clearly below" (qualified.md §4). */
const CLEARLY_BELOW = 0.5;

const WEEK = 7 * 864e5;
const MIN_LEAD_WEEKS = 6; // services.md: cannot begin a project that must be ready in under 6 weeks
const MAX_SITE_WAIT_WEEKS = 10; // qualified.md: site available for execution within 8-10 weeks

export const DECLINE_LINE =
  "This sounds like it may not be the right fit for us right now — but feel free to reach out if your timeline or scope changes.";

export function cheapestPlausibleCost(x: Extraction): number | null {
  const commercial = x.project_category.startsWith("commercial");
  if (commercial) return x.carpet_area_sqft ? x.carpet_area_sqft * FLOOR_PER_SQFT_COMMERCIAL : null;
  if (x.project_category === "residential_full_home") {
    const bhk = x.property?.match(/(\d)\s*bhk/i)?.[1];
    const sqft = x.carpet_area_sqft ?? (bhk ? BHK_TYPICAL_SQFT[bhk] : null);
    return sqft ? sqft * FLOOR_PER_SQFT_RESIDENTIAL : null;
  }
  if (x.project_category === "residential_partial" || x.project_category === "residential_single_room") {
    return Math.max(1, x.rooms_in_scope.length) * FLOOR_SINGLE_ROOM;
  }
  return null;
}

const r = (verdict: CriterionResult["verdict"], note: string, evidence: string | null): CriterionResult => ({ verdict, note, evidence });

function judgeScope(x: Extraction): CriterionResult {
  const ev = x.evidence.scope;
  const c = x.project_category;
  if (c === "hospitality_retail_or_gym") return r("fail", "Restaurants, hotels, retail and gyms are out of scope.", ev);
  if (c === "advice_or_decor_only") return r("fail", "Advice / decor only. Minimum engagement is a room redesign with execution.", ev);
  if (c === "vastu_only") return r("fail", "Standalone Vastu advisory is not offered.", ev);
  if (c === "furniture_sourcing_only") return r("fail", "Furniture sourcing without a design project is not offered.", ev);
  if (c === "execution_only") return r("fail", "Execution-only work (caller has their own design) is not offered.", ev);
  if (c === "architecture_or_structural") return r("fail", "Structural / architectural work is not offered.", ev);
  if (x.structural_changes_requested) return r("fail", "Needs structural changes (moving walls), which the studio does not do.", ev);
  if (c.startsWith("commercial") && x.carpet_area_sqft != null) {
    if (x.carpet_area_sqft < 500) return r("fail", `${x.carpet_area_sqft} sq ft is below the ~500 sq ft commercial minimum.`, ev);
    if (x.carpet_area_sqft > 3500) return r("fail", `${x.carpet_area_sqft} sq ft is above the ~3,000 sq ft commercial limit.`, ev);
  }
  if (x.wants_design_and_execution === "no") return r("fail", "Caller does not want design and execution together.", ev);
  if (c === "unknown" || x.wants_design_and_execution === "unclear") {
    return r("unclear", "Not yet clear whether this is a full design + execution project.", ev);
  }
  const rented = x.rented_property ? " Rented, no structural work: fine." : "";
  return r("pass", `${c.replaceAll("_", " ")} with design and execution.${rented}`, ev);
}

function judgeArea(x: Extraction): { result: CriterionResult; zone: Decision["zone"] } {
  const ev = x.evidence.area;
  const text = (x.location_text ?? "").toLowerCase();
  const out = has(text, OUTSIDE);
  if (out) return { result: r("fail", `${title(out)} is outside Pune / PCMC.`, ev), zone: "outside" };
  const pcmc = has(text, PCMC);
  if (pcmc) return { result: r("pass", `${title(pcmc)} (PCMC).`, ev), zone: "pcmc" };
  const pune = has(text, PUNE);
  if (pune) return { result: r("pass", `${title(pune)} (Pune city).`, ev), zone: "pune" };
  if (x.caller_says_city === "other") return { result: r("fail", "Site is outside Pune / PCMC.", ev), zone: "outside" };
  if (x.caller_says_city === "pune" || x.caller_says_city === "pcmc") {
    return { result: r("pass", `Caller says ${x.caller_says_city.toUpperCase()}; locality "${x.location_text ?? "?"}" not on our list, designer to confirm.`, ev), zone: x.caller_says_city };
  }
  return { result: r("unclear", "Site location not given.", ev), zone: "unknown" };
}

function judgeTimeline(x: Extraction, callDate: Date): CriterionResult {
  const ev = x.evidence.timeline;
  const weeksUntil = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? (Date.parse(iso) - callDate.getTime()) / WEEK : null);
  const due = weeksUntil(x.needed_by);
  if (due != null && due < MIN_LEAD_WEEKS) {
    return r("fail", `Needs completion in ~${Math.max(0, Math.round(due))} weeks; minimum is ${MIN_LEAD_WEEKS}, and design alone takes 3-4.`, ev);
  }
  const avail = weeksUntil(x.site_available_from);
  if (x.site_status === "available_later" && avail != null && avail > MAX_SITE_WAIT_WEEKS) {
    return r("fail", `Site only available in ~${Math.round(avail)} weeks; re-engage closer to possession.`, ev);
  }
  if (due != null) {
    const tight = due < 10 ? " Tight: flag to designer." : "";
    return r("pass", `Needed by ${x.needed_by} (~${Math.round(due)} weeks).${tight}`, ev);
  }
  if (x.site_status === "available_now") return r("pass", "Site available now; no hard deadline.", ev);
  if (x.site_status === "available_later" && avail != null) return r("pass", `Site available in ~${Math.round(avail)} weeks.`, ev);
  // A preferred start ("January start, we're flexible") with no deadline is a workable timeline.
  if (x.timeline_text) return r("pass", `"${x.timeline_text}", no hard deadline.`, ev);
  return r("unclear", "No timeline or site availability given.", ev);
}

function judgeBudget(x: Extraction): CriterionResult {
  const ev = x.evidence.budget;
  // qualified.md: "If budget is not mentioned, treat as qualified." Never probe.
  if (!x.budget_volunteered || x.budget_max_inr == null) return r("pass", "Not volunteered (not probed, per policy).", ev);
  const floor = cheapestPlausibleCost(x);
  if (floor == null) return r("unclear", `Volunteered ${x.budget_text ?? lakh(x.budget_max_inr)}; scope too vague to check.`, ev);
  if (x.budget_max_inr < floor * CLEARLY_BELOW) {
    return r("fail", `Volunteered ${x.budget_text ?? lakh(x.budget_max_inr)}: clearly below what this scope costs.`, ev);
  }
  if (x.budget_max_inr < floor) return r("pass", `Volunteered ${x.budget_text ?? lakh(x.budget_max_inr)}: may be tight for this scope, designer to discuss.`, ev);
  return r("pass", `Volunteered ${x.budget_text ?? lakh(x.budget_max_inr)}: in range for the scope.`, ev);
}

function judgeDecisionMaker(x: Extraction): CriterionResult {
  const ev = x.evidence.decision_maker;
  const note = x.decision_maker_note ? ` ${x.decision_maker_note}` : "";
  switch (x.decision_maker) {
    case "owner_or_joint_owner": return r("pass", `Owner.${note}`, ev);
    case "authorised_representative": return r("pass", `Authorised to go ahead.${note}`, ev);
    case "not_authorised": return r("fail", `Not authorised to proceed.${note}`, ev);
    case "researching_for_others": return r("unclear", `Researching for the decision-makers.${note}`, ev);
    default: return r("unclear", "Did not confirm who decides.", ev);
  }
}

export function decide(x: Extraction, callDate: Date): Decision {
  const area = judgeArea(x);
  const criteria: Record<Criterion, CriterionResult> = {
    scope: judgeScope(x),
    area: area.result,
    timeline: judgeTimeline(x, callDate),
    budget: judgeBudget(x),
    decision_maker: judgeDecisionMaker(x),
  };
  const flags: string[] = [];
  if (x.pricing_asked) flags.push("asked_pricing");
  if (x.frustrated_or_repeat) flags.push("frustrated_or_repeat");
  if (x.referral) flags.push("referral");
  if (x.site_visit_requested) flags.push("site_visit");
  if (criteria.budget.verdict === "pass" && /tight/.test(criteria.budget.note)) flags.push("budget_tight");
  if (criteria.timeline.verdict === "pass" && /Tight/.test(criteria.timeline.note)) flags.push("timeline_tight");

  const base = { criteria, flags, zone: area.zone };

  if (x.intent === "existing_client_issue") {
    return { ...base, status: "ESCALATED", priority: "urgent", reasons: ["Existing client with a problem on a live project."], closingLine: null };
  }
  if (x.intent === "no_conversation") {
    return { ...base, status: "NEEDS_INFO", priority: "high", reasons: ["Call ended before any details were shared. Call back."], closingLine: null };
  }
  if (x.intent === "vendor_or_job" || x.intent === "spam_or_wrong_number") {
    return { ...base, status: "DISQUALIFIED", priority: "normal", reasons: ["Not a project enquiry."], closingLine: null };
  }

  const fails = (Object.keys(criteria) as Criterion[]).filter((k) => criteria[k].verdict === "fail");
  // Unclear on 1, 2 or 3 → ask one question. Unclear on 4 or 5 → treat as qualified, note it.
  const blockingUnclear = (["scope", "area", "timeline"] as Criterion[]).filter((k) => criteria[k].verdict === "unclear");
  const priority = x.frustrated_or_repeat || x.intent === "follow_up_on_unanswered_enquiry" ? "high" : "normal";

  let status: LeadStatus;
  let reasons: string[];
  let closingLine: string | null = null;
  if (fails.length > 0) {
    status = "DISQUALIFIED";
    reasons = fails.map((k) => criteria[k].note);
    closingLine = fails.length >= 2 ? DECLINE_LINE : null;
  } else if (blockingUnclear.length > 0) {
    status = "NEEDS_INFO";
    reasons = blockingUnclear.map((k) => criteria[k].note);
  } else {
    status = "QUALIFIED";
    reasons = (["budget", "decision_maker"] as Criterion[])
      .filter((k) => criteria[k].verdict === "unclear")
      .map((k) => `Uncertain, not blocking: ${criteria[k].note}`);
  }
  return { ...base, status, priority, reasons, closingLine };
}

/** The one question to ask when a blocking criterion is unclear (qualified.md: "ask one direct question"). */
export const CLARIFYING_QUESTION: Record<"scope" | "area" | "timeline", string> = {
  scope: "Are you looking for us to design and carry out the work end to end, or mainly for ideas and advice?",
  area: "Which area of Pune is the property in?",
  timeline: "When would you need the project complete?",
};

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export const lakh = (n: number) => `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)} lakh`;
