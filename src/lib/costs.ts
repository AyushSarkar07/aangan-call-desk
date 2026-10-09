import type { CostRecord } from "./types";

export interface Rates {
  vaaniInrPerMin: number;
  geminiUsdPerMInput: number;
  geminiUsdPerMOutput: number;
  usdInr: number;
}

/** Cost of handling one call: Vaani voice minutes (billed per started minute) plus Gemini tokens. */
export function callCost(
  callId: string,
  durationSec: number,
  usage: { input: number; output: number; model: string | null },
  rates: Rates,
): CostRecord {
  const minutes = durationSec > 0 ? Math.ceil(durationSec / 60) : 0;
  const voice = minutes * rates.vaaniInrPerMin;
  const llm = ((usage.input * rates.geminiUsdPerMInput + usage.output * rates.geminiUsdPerMOutput) / 1e6) * rates.usdInr;
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    call_id: callId,
    stt_cost: null,
    tts_cost: null,
    voice_cost: round(voice),
    llm_cost: round(llm),
    total_cost: round(voice + llm),
    llm_model: usage.model,
    llm_input_tokens: usage.input,
    llm_output_tokens: usage.output,
  };
}
