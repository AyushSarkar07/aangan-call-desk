import { z } from "zod";
import { Extraction } from "../types";
import { transcriptText } from "../transcript";
import type { Turn } from "../types";

export const EXTRACTION_SYSTEM = `You read phone-call transcripts for Aangan Studio, an interior design studio in Pune (homes and small offices, design + execution with its own contractors).

Your only job is to extract FACTS from the transcript into the JSON schema. Do not decide whether the lead qualifies; code does that.

Rules:
- Use only what the CALLER said (or confirmed). The agent's questions are not facts. If something was not said, use null / "unknown" / false.
- project_category: residential_full_home = whole flat/house (2BHK+); residential_partial = 2+ rooms or a floor; residential_single_room = one room; commercial_office / commercial_clinic_or_studio for workspaces; hospitality_retail_or_gym for restaurants, hotels, shops, gyms; advice_or_decor_only when they want ideas, suggestions, colours or styling without execution; execution_only when they already have a design and just want contractors.
- wants_design_and_execution: "yes" when they want the space properly designed and done (kitchen, wardrobes, redesign, fitout), "no" for advice/ideas only, "unclear" if you genuinely cannot tell.
- caller_says_city: what city the site is in. A Pune locality (Kothrud, Baner, Kharadi...) = "pune"; Pimpri, Chinchwad, Wakad, Hinjewadi... = "pcmc"; Talegaon, Nashik, Mumbai, Lonavala or any other town = "other".
- site_status: "available_now" if they already live there (e.g. redoing the interiors of their own flat), have possession, or the space is empty and accessible; "available_later" if possession is in the future; else "unknown".
- Dates: resolve relative to the CALL DATE given below. A month alone ("by March") means the last day of the next occurrence of that month. "Before Diwali" means the date of the next Diwali. "In about six weeks" means call date + 42 days. Output YYYY-MM-DD.
- If the conversation itself says how far away a date is (e.g. the agent says "Diwali is about three weeks away" and the caller doesn't dispute it), use that, not your own calendar.
- needed_by is when the project must be COMPLETE (move-in, operational, guests arriving). Do not confuse it with when design should start.
- budget_max_inr: only if the caller volunteered a figure. "1 to 1.5 lakh" -> 150000. "60-80 lakh" -> 8000000.
- decision_maker: "unknown" unless the caller says or clearly implies who decides ("we bought it", "I'm the founder", "my husband and I"). owner_or_joint_owner if they own it (alone or with a spouse who is on board) or are the founder/head of the company; authorised_representative if calling for someone who explicitly authorised them; researching_for_others if they are checking for parents/in-laws/boss who will decide; not_authorised if they say they cannot commit.
- intent: existing_client_issue for anyone whose project is already underway with the studio (complaints, chasing their designer). follow_up_on_unanswered_enquiry if a NEW prospect says they called/messaged before and nobody got back. no_conversation if the call dropped or was missed before any project details.
- evidence: short verbatim caller quotes (max ~20 words each).
- key_notes: what a designer should know before calling back: style, constraints, who will attend, how they found the studio, mood. No pricing figures.

Return JSON only.`;

export function extractionInput(turns: Turn[], callDate: Date) {
  const ist = new Date(callDate.getTime() + 5.5 * 3600e3);
  const date = ist.toISOString().slice(0, 10);
  const weekday = ist.toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
  return `CALL DATE: ${date} (${weekday}), Asia/Kolkata\n\nTRANSCRIPT:\n${turns.length ? transcriptText(turns) : "(no conversation: missed or dropped call)"}`;
}

export const extractionJsonSchema = z.toJSONSchema(Extraction, { target: "draft-2020-12" });
