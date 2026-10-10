import "server-only";

const env = (k: string) => {
  const v = process.env[k]?.trim();
  return v ? v : undefined;
};
const num = (k: string, d: number) => {
  const v = Number(env(k));
  return Number.isFinite(v) && v > 0 ? v : d;
};

/** Each integration runs live when its keys are set, and is simulated (and labelled so) when not. */
export function getConfig() {
  return {
    db: env("DATABASE_URL") ? ("postgres" as const) : ("memory" as const),
    ai: env("GEMINI_API_KEY") ? ("gemini" as const) : ("simulated" as const),
    geminiModel: env("GEMINI_MODEL") ?? "gemini-3.8-flash",
    telegram: env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID") ? ("live" as const) : ("simulated" as const),
    cal: env("CAL_API_KEY") && env("CAL_EVENT_TYPE_ID") ? ("live" as const) : ("simulated" as const),
    hubspot: env("HUBSPOT_TOKEN") ? ("live" as const) : ("simulated" as const),
    vaaniSecret: env("VAANI_WEBHOOK_SECRET") ?? null,
    appUrl: env("APP_URL") ?? (env("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${env("VERCEL_PROJECT_PRODUCTION_URL")}` : "http://localhost:3000"),
  };
}
export type AppConfig = ReturnType<typeof getConfig>;

/**
 * Unit costs, all overridable from the environment. INR throughout.
 * Vaani (vaanivoice.ai) shows ₹5.60/min (estimated) on the agent page for this setup,
 * billed per started minute. Set VAANI_INR_PER_MIN to the real rate from the dashboard.
 */
export function getRates() {
  return {
    vaaniInrPerMin: num("VAANI_INR_PER_MIN", 5.6),
    geminiUsdPerMInput: num("GEMINI_USD_PER_M_INPUT", 0.3),
    geminiUsdPerMOutput: num("GEMINI_USD_PER_M_OUTPUT", 2.5),
    usdInr: num("USD_INR", 88),
    /** Fixed monthly platform costs: Vercel Hobby, Supabase free, Telegram, Cal.com free, HubSpot free CRM. */
    fixedMonthlyInr: num("FIXED_MONTHLY_INR", 0),
    /** Business assumptions shown on the dashboard, from the case brief. */
    avgProjectValueInr: num("AVG_PROJECT_VALUE_INR", 1_100_000), // ₹8-14 lakh, midpoint
    consultToProjectRate: num("CONSULT_TO_PROJECT_RATE", 0.25),
    enquiriesPerMonth: num("ENQUIRIES_PER_MONTH", 200),
  };
}
