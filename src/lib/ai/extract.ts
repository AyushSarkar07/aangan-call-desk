import "server-only";
import { GoogleGenAI } from "@google/genai";
import { Extraction, type Turn } from "../types";
import { getConfig } from "../config";
import { EXTRACTION_SYSTEM, extractionInput, extractionJsonSchema } from "./prompt";
import { simulateExtraction } from "./simulated";

export interface ExtractResult {
  extraction: Extraction;
  usage: { input: number; output: number; model: string | null };
  live: boolean;
}

let client: GoogleGenAI | null = null;

/** Gemini Flash reads the transcript into structured facts. Retries once if the JSON fails validation. */
export async function extract(turns: Turn[], callDate: Date): Promise<ExtractResult> {
  const cfg = getConfig();
  if (cfg.ai === "simulated" || turns.length === 0) {
    return { extraction: simulateExtraction(turns), usage: { input: 0, output: 0, model: null }, live: false };
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const input = extractionInput(turns, callDate);
  let lastError = "";
  let inTok = 0;
  let outTok = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.interactions.create({
      model: cfg.geminiModel,
      system_instruction: EXTRACTION_SYSTEM,
      input: attempt === 0 ? input : `${input}\n\nYour previous reply failed validation (${lastError}). Reply again with JSON matching the schema exactly.`,
      response_format: { type: "text", mime_type: "application/json", schema: extractionJsonSchema as Record<string, unknown> },
      generation_config: { thinking_level: "low" },
      store: false,
    });
    inTok += res.usage?.total_input_tokens ?? 0;
    outTok += (res.usage?.total_output_tokens ?? 0) + (res.usage?.total_thought_tokens ?? 0);
    try {
      return { extraction: Extraction.parse(JSON.parse(res.output_text ?? "")), usage: { input: inTok, output: outTok, model: cfg.geminiModel }, live: true };
    } catch (e) {
      lastError = (e as Error).message.slice(0, 300);
    }
  }
  throw new Error(`Gemini returned invalid structured output twice: ${lastError}`);
}
