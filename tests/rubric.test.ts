import { describe, expect, it } from "vitest";
import { decide, DECLINE_LINE } from "@/lib/rubric";
import { pricingLeaks, isAfterHours, parseTranscript } from "@/lib/transcript";
import { buildHandoff, toMarkdown } from "@/lib/handoff";
import { callCost } from "@/lib/costs";
import type { Extraction } from "@/lib/types";

const base: Extraction = {
  intent: "new_project_enquiry",
  caller_name: "Priya",
  project_category: "residential_full_home",
  wants_design_and_execution: "yes",
  structural_changes_requested: false,
  rented_property: false,
  property: "3BHK apartment",
  rooms_in_scope: ["kitchen", "living room", "2 bedrooms"],
  carpet_area_sqft: 1400,
  location_text: "Kothrud, Dahanukar Colony",
  caller_says_city: "pune",
  site_status: "available_now",
  site_available_from: null,
  needed_by: "2027-03-31",
  timeline_text: "Done by March",
  budget_volunteered: false,
  budget_text: null,
  budget_max_inr: null,
  decision_maker: "owner_or_joint_owner",
  decision_maker_note: "Husband on board",
  pricing_asked: false,
  frustrated_or_repeat: false,
  referral: "Shruti Joshi",
  preferred_consultation: null,
  site_visit_requested: false,
  key_notes: "Builder-finish flat, wants it to feel designed.",
  summary: "Priya wants a full 3BHK redesign in Kothrud.",
  evidence: { scope: "redo the whole thing", area: "3BHK in Kothrud", timeline: "done by March", budget: null, decision_maker: "myself and my husband" },
};
const day = new Date("2026-09-02T10:23:00+05:30");
const x = (patch: Partial<Extraction>): Extraction => ({ ...base, ...patch });

describe("rubric", () => {
  it("qualifies a clean full-home enquiry", () => {
    const d = decide(base, day);
    expect(d.status).toBe("QUALIFIED");
    expect(d.zone).toBe("pune");
  });

  it("declines outside the service area, even with a big budget (F03 Talegaon)", () => {
    const d = decide(x({ location_text: "Talegaon Dabhade, near Pune", budget_volunteered: true, budget_max_inr: 2_000_000 }), day);
    expect(d.status).toBe("DISQUALIFIED");
    expect(d.criteria.area.verdict).toBe("fail");
    expect(d.zone).toBe("outside");
  });

  it("puts PCMC localities in the service area", () => {
    expect(decide(x({ location_text: "Pimple Saudagar" }), day).zone).toBe("pcmc");
    expect(decide(x({ location_text: "Hinjewadi Phase 1" }), day).criteria.area.verdict).toBe("pass");
  });

  it("fails a 3-week deadline (T07 Diwali)", () => {
    const d = decide(x({ rooms_in_scope: ["living room", "kitchen"], project_category: "residential_partial", needed_by: "2026-09-29" }), new Date("2026-09-08T09:44:00+05:30"));
    expect(d.criteria.timeline.verdict).toBe("fail");
    expect(d.status).toBe("DISQUALIFIED");
  });

  it("fails a volunteered budget that is clearly too low (T10)", () => {
    const d = decide(x({ project_category: "residential_partial", rooms_in_scope: ["kitchen", "bedroom"], carpet_area_sqft: 550, budget_volunteered: true, budget_text: "1 to 1.5 lakh", budget_max_inr: 150_000, location_text: "Kharadi" }), day);
    expect(d.criteria.budget.verdict).toBe("fail");
    expect(d.status).toBe("DISQUALIFIED");
  });

  it("passes but flags a budget that is only slightly under (F10)", () => {
    const d = decide(x({ carpet_area_sqft: 1300, budget_volunteered: true, budget_text: "₹18-22 lakh", budget_max_inr: 2_200_000 }), day);
    expect(d.status).toBe("QUALIFIED");
    expect(d.flags).toContain("budget_tight");
  });

  it("treats an unmentioned budget as a pass (never probe)", () => {
    expect(decide(base, day).criteria.budget.verdict).toBe("pass");
  });

  it("declines advice-only and hospitality scope", () => {
    expect(decide(x({ project_category: "advice_or_decor_only", wants_design_and_execution: "no" }), day).status).toBe("DISQUALIFIED");
    expect(decide(x({ project_category: "hospitality_retail_or_gym" }), day).status).toBe("DISQUALIFIED");
  });

  it("declines commercial spaces below ~500 sq ft (T18)", () => {
    expect(decide(x({ project_category: "commercial_office", carpet_area_sqft: 180 }), day).criteria.scope.verdict).toBe("fail");
  });

  it("asks one question when area, scope or timeline is unclear", () => {
    const d = decide(x({ location_text: null, caller_says_city: "unknown" }), day);
    expect(d.status).toBe("NEEDS_INFO");
  });

  it("qualifies with a note when only the decision-maker is unclear (T14)", () => {
    const d = decide(x({ decision_maker: "researching_for_others", decision_maker_note: "Parents decide and will attend" }), day);
    expect(d.status).toBe("QUALIFIED");
    expect(d.reasons.join(" ")).toMatch(/Uncertain/);
  });

  it("escalates existing clients regardless of criteria (T09)", () => {
    const d = decide(x({ intent: "existing_client_issue" }), day);
    expect(d.status).toBe("ESCALATED");
    expect(d.priority).toBe("urgent");
  });

  it("uses the standard decline line when two or more criteria fail", () => {
    const d = decide(x({ location_text: "Nashik", needed_by: "2026-09-20" }), day);
    expect(d.closingLine).toBe(DECLINE_LINE);
  });

  it("allows rented flats without structural work, refuses structural changes", () => {
    expect(decide(x({ rented_property: true }), day).status).toBe("QUALIFIED");
    expect(decide(x({ structural_changes_requested: true }), day).status).toBe("DISQUALIFIED");
  });

  it("passes a preferred start with no deadline (T20)", () => {
    const d = decide(x({ needed_by: null, site_status: "unknown", timeline_text: "Flexible, January start for execution" }), day);
    expect(d.criteria.timeline.verdict).toBe("pass");
    expect(decide(x({ needed_by: null, site_status: "unknown", timeline_text: null }), day).criteria.timeline.verdict).toBe("unclear");
  });

  it("fails a site that is not available for more than 10 weeks", () => {
    const d = decide(x({ site_status: "available_later", site_available_from: "2027-03-01", needed_by: null }), day);
    expect(d.criteria.timeline.verdict).toBe("fail");
  });
});

describe("pricing compliance", () => {
  it("flags any figure the agent volunteers", () => {
    const turns = parseTranscript("Caller: How much for a 2BHK?\nAgent: It's usually around ₹1,800 per sq ft.");
    expect(pricingLeaks(turns)).toHaveLength(1);
  });
  it("does not flag the agent repeating the caller's own budget (T10)", () => {
    const turns = parseTranscript("Caller: My budget is 1 to 1.5 lakh maximum.\nAgent: 1 to 1.5 lakh would be significantly below what that scope costs.");
    expect(pricingLeaks(turns)).toHaveLength(0);
  });
  it("does not flag the scripted deflection", () => {
    const turns = parseTranscript("Agent: Pricing depends on the site, the materials you choose, and the scope — your designer will walk you through it in detail at the consultation.");
    expect(pricingLeaks(turns)).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("knows front-desk hours in IST", () => {
    expect(isAfterHours(new Date("2026-09-09T22:47:00+05:30"))).toBe(true);
    expect(isAfterHours(new Date("2026-09-25T09:15:00+05:30"))).toBe(true);
    expect(isAfterHours(new Date("2026-09-02T10:23:00+05:30"))).toBe(false);
  });
  it("bills Vaani per started minute", () => {
    const c = callCost("x", 61, { input: 2000, output: 500, model: "m" }, { vaaniInrPerMin: 2.4, geminiUsdPerMInput: 0.3, geminiUsdPerMOutput: 2.5, usdInr: 88 });
    expect(c.voice_cost).toBe(4.8);
    expect(c.llm_cost).toBeCloseTo(0.163, 3);
  });
  it("renders the handoff in the agreed format", () => {
    const d = decide(base, day);
    const md = toMarkdown(buildHandoff({ phone: "+919000000101", callStart: day, durationSec: 252, afterHours: false, extraction: base, decision: d, booking: { provider: "simulated", id: null, start: "2026-09-03T05:30:00Z", status: "held" } }));
    expect(md.split("\n")[0]).toBe("📌 NEW QUALIFIED LEAD HANDOFF");
    for (const f of ["Caller Name: Priya", "Contact Number: +919000000101", "Location & Property Type:", "Scope:", "Possession & Timeline:", "Budget Mentioned: Unspecified", "Key Notes & Vibe:", "Action Taken:"]) {
      expect(md).toContain(f);
    }
    expect(md).not.toMatch(/₹\s?\d|per sq/);
  });
});
