// Keyword fallback used only when GEMINI_API_KEY is not set, so the app runs offline.
// Results are labelled "simulated" everywhere they appear. It is deliberately simple.
import type { Extraction, Turn } from "../types";

export function simulateExtraction(turns: Turn[]): Extraction {
  const caller = turns.filter((t) => t.speaker === "caller").map((t) => t.text).join(" ");
  const c = caller.toLowerCase();
  const sqft = c.match(/(\d[\d,]{2,})\s*(sq|square)/)?.[1];
  const bhk = c.match(/(\d)\s*bhk/)?.[1];
  const lakhs = [...c.matchAll(/(\d+(?:\.\d+)?)\s*(?:to\s*\d+(?:\.\d+)?\s*)?lakh/g)].map((m) => m[0]);
  const lakhMax = lakhs.length ? Math.max(...lakhs.flatMap((s) => (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))) * 1e5 : null;
  const loc = caller.match(/\b(?:in|at|from)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/)?.[1] ?? null;
  const any = (...w: string[]) => w.some((x) => new RegExp(`\\b${x}\\b`).test(c));

  let category: Extraction["project_category"] = "unknown";
  if (any("restaurant", "hotel", "gym", "retail", "shop")) category = "hospitality_retail_or_gym";
  else if (any("ideas", "suggestions", "advise", "advice")) category = "advice_or_decor_only";
  else if (any("office", "workstations", "cabin")) category = "commercial_office";
  else if (any("whole", "full", "complete", "entire", "everything", "villa")) category = "residential_full_home";
  else if (bhk && any("kitchen", "bedroom", "living", "wardrobe")) category = "residential_partial";

  return {
    intent: turns.length === 0 ? "no_conversation" : any("my designer", "my project has been", "not acceptable") ? "existing_client_issue" : any("called on", "get back to me", "nobody replied") ? "follow_up_on_unanswered_enquiry" : "new_project_enquiry",
    caller_name: caller.match(/(?:i'm|i am|this is|my name is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i)?.[1] ?? null,
    project_category: category,
    wants_design_and_execution: category === "advice_or_decor_only" ? "no" : category === "unknown" ? "unclear" : "yes",
    structural_changes_requested: any("break wall", "move wall", "remove wall"),
    rented_property: any("rented", "lease"),
    property: bhk ? `${bhk}BHK` : any("villa") ? "villa" : null,
    rooms_in_scope: ["kitchen", "living room", "bedroom", "wardrobes", "study"].filter((r) => c.includes(r.split(" ")[0])),
    carpet_area_sqft: sqft ? Number(sqft.replace(/,/g, "")) : null,
    location_text: loc,
    caller_says_city: any("nashik", "mumbai", "talegaon", "lonavala") ? "other" : loc ? "pune" : "unknown",
    site_status: any("possession", "moved", "we have", "been here", "bare", "empty") ? "available_now" : "unknown",
    site_available_from: null,
    needed_by: null,
    timeline_text: null,
    budget_volunteered: lakhMax != null,
    budget_text: lakhs[0] ?? null,
    budget_max_inr: lakhMax,
    decision_maker: any("my parents", "in-laws", "for my") ? "researching_for_others" : any("owner", "husband", "wife", "founder", "my flat", "we have") ? "owner_or_joint_owner" : "unknown",
    decision_maker_note: null,
    pricing_asked: any("cost", "price", "how much", "ballpark", "rate"),
    frustrated_or_repeat: any("not acceptable", "get back to me", "not a good sign"),
    referral: null,
    preferred_consultation: null,
    site_visit_requested: any("site visit", "come to site"),
    key_notes: "Simulated extraction (no Gemini key configured). Read the transcript.",
    summary: caller.slice(0, 140) || "No conversation.",
    evidence: { scope: null, area: loc, timeline: null, budget: lakhs[0] ?? null, decision_maker: null },
  };
}
