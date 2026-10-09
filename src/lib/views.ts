import "server-only";
import { getConfig, getRates } from "./config";
import { computeMetrics } from "./metrics";
import { getStore } from "./store";

export type Period = "all" | "live" | "replay";
export const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All calls" },
  { key: "live", label: "Live calls" },
  { key: "replay", label: "September replay" },
];

export async function loadPeriod(p: Period) {
  const rows = await getStore().listCalls();
  const filtered = p === "all" ? rows : p === "replay" ? rows.filter((r) => r.call.source === "replay") : rows.filter((r) => r.call.source !== "replay");
  return { rows: filtered, metrics: computeMetrics(filtered, getRates()), hasAny: rows.length > 0 };
}

export function modes() {
  const c = getConfig();
  return [
    { name: "Gemini", live: c.ai === "gemini", detail: c.ai === "gemini" ? c.geminiModel : "keyword fallback" },
    { name: "Database", live: c.db === "postgres", detail: c.db === "postgres" ? "Postgres" : "in-memory" },
    { name: "Telegram", live: c.telegram === "live" },
    { name: "Cal.com", live: c.cal === "live" },
    { name: "HubSpot", live: c.hubspot === "live" },
    { name: "Vaani webhook", live: Boolean(c.vaaniSecret) },
  ];
}
