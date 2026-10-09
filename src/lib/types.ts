import { z } from "zod";

export type Speaker = "agent" | "caller";
export interface Turn {
  speaker: Speaker;
  text: string;
}

export const STATUSES = ["QUALIFIED", "NEEDS_INFO", "DISQUALIFIED", "ESCALATED"] as const;
export type LeadStatus = (typeof STATUSES)[number];
export type CallStatus = LeadStatus | "PROCESSING" | "FAILED";

export const CRITERIA = ["scope", "area", "timeline", "budget", "decision_maker"] as const;
export type Criterion = (typeof CRITERIA)[number];
export type Verdict = "pass" | "fail" | "unclear";

export const CRITERION_LABEL: Record<Criterion, string> = {
  scope: "Real project",
  area: "Service area",
  timeline: "Timeline",
  budget: "Budget",
  decision_maker: "Decision-maker",
};

/** What Gemini reads out of a transcript. Facts only: the rubric decision is made in code (rubric.ts). */
export const Extraction = z.object({
  intent: z.enum([
    "new_project_enquiry",
    "follow_up_on_unanswered_enquiry",
    "existing_client_issue",
    "vendor_or_job",
    "spam_or_wrong_number",
    "no_conversation",
  ]),
  caller_name: z.string().nullable(),
  project_category: z.enum([
    "residential_full_home",
    "residential_partial",
    "residential_single_room",
    "commercial_office",
    "commercial_clinic_or_studio",
    "hospitality_retail_or_gym",
    "advice_or_decor_only",
    "vastu_only",
    "furniture_sourcing_only",
    "execution_only",
    "architecture_or_structural",
    "unknown",
  ]),
  wants_design_and_execution: z.enum(["yes", "no", "unclear"]),
  structural_changes_requested: z.boolean(),
  rented_property: z.boolean(),
  property: z.string().nullable().describe("e.g. '3BHK apartment', 'villa, G+2', 'bare-shell office'"),
  rooms_in_scope: z.array(z.string()).describe("Rooms or areas the caller wants done, e.g. ['kitchen','master bedroom']"),
  carpet_area_sqft: z.number().nullable(),
  location_text: z.string().nullable().describe("Locality and city exactly as the caller said it"),
  caller_says_city: z.enum(["pune", "pcmc", "other", "unknown"]),
  site_status: z.enum(["available_now", "available_later", "unknown"]),
  site_available_from: z.string().nullable().describe("ISO date (YYYY-MM-DD) the site becomes available, if later"),
  needed_by: z.string().nullable().describe("ISO date (YYYY-MM-DD) the caller needs the project complete, if stated"),
  timeline_text: z.string().nullable(),
  budget_volunteered: z.boolean(),
  budget_text: z.string().nullable(),
  budget_max_inr: z.number().nullable().describe("Upper end of the budget the caller volunteered, in rupees"),
  decision_maker: z.enum(["owner_or_joint_owner", "authorised_representative", "researching_for_others", "not_authorised", "unknown"]),
  decision_maker_note: z.string().nullable(),
  pricing_asked: z.boolean(),
  frustrated_or_repeat: z.boolean().describe("Caller is upset or says an earlier enquiry went unanswered"),
  referral: z.string().nullable().describe("Who referred them or where they found the studio"),
  preferred_consultation: z.string().nullable().describe("Day/time preference for the consultation, as said"),
  site_visit_requested: z.boolean(),
  key_notes: z.string().describe("Style preferences, constraints, special requests and tone, 1-3 sentences, for the designer"),
  summary: z.string().describe("One sentence: who called and what they want"),
  evidence: z.object({
    scope: z.string().nullable(),
    area: z.string().nullable(),
    timeline: z.string().nullable(),
    budget: z.string().nullable(),
    decision_maker: z.string().nullable(),
  }).describe("Short verbatim caller quote supporting each fact, or null"),
});
export type Extraction = z.infer<typeof Extraction>;

export interface CriterionResult {
  verdict: Verdict;
  note: string;
  evidence: string | null;
}

export interface Decision {
  status: LeadStatus;
  priority: "normal" | "high" | "urgent";
  criteria: Record<Criterion, CriterionResult>;
  reasons: string[];
  flags: string[];
  /** What the agent should have said to close the call, when the lead is not forwarded. */
  closingLine: string | null;
  zone: "pune" | "pcmc" | "outside" | "unknown";
}

export interface Booking {
  provider: "cal.com" | "simulated";
  id: string | null;
  start: string; // ISO
  status: "booked" | "held" | "failed";
  note?: string;
}

export interface CallRecord {
  id: string;
  source: "vaani" | "replay" | "simulator";
  vaani_event_id: string | null;
  vaani_call_id: string | null;
  caller_phone: string | null;
  start_time: string;
  duration_sec: number;
  after_hours: boolean;
  transcript: Turn[];
  status: CallStatus;
  intent: string | null;
  linked_call_id: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface LeadRecord {
  id: string;
  call_id: string;
  caller_name: string | null;
  project_type: string | null;
  scope: string | null;
  location: string | null;
  zone: Decision["zone"];
  carpet_area: number | null;
  timeline: string | null;
  needed_by: string | null;
  budget: string | null;
  budget_max_inr: number | null;
  decision_maker: string | null;
  status: LeadStatus;
  priority: Decision["priority"];
  criteria: Decision["criteria"];
  reasons: string[];
  flags: string[];
  handoff_summary: string | null;
  booking: Booking | null;
  hubspot_deal_id: string | null;
  telegram_message_id: number | null;
  handoff_sent_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  extraction?: Extraction;
}

export interface CostRecord {
  call_id: string;
  stt_cost: number | null;
  llm_cost: number;
  tts_cost: number | null;
  voice_cost: number;
  total_cost: number;
  llm_model: string | null;
  llm_input_tokens: number;
  llm_output_tokens: number;
}

export interface EventRecord {
  id?: number;
  call_id: string | null;
  kind: string;
  ok: boolean;
  detail: Record<string, unknown>;
  at: string;
}
