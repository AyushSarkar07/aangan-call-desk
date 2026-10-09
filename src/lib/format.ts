export const inr = (n: number, digits = 0) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
export const inrCompact = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : inr(n));
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const ist = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });
export const dur = (sec: number) => (sec <= 0 ? "Missed" : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`);
export const secs = (s: number | null) => (s == null ? "—" : s < 90 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
export const FLAG_LABEL: Record<string, string> = {
  asked_pricing: "Asked pricing",
  frustrated_or_repeat: "Frustrated / repeat",
  referral: "Referral",
  site_visit: "Wants site visit",
  budget_tight: "Budget may be tight",
  timeline_tight: "Tight timeline",
  price_quoted: "⚠ Agent quoted a price",
};
