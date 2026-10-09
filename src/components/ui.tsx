import type { ReactNode } from "react";
import type { CallStatus, Verdict } from "@/lib/types";

export function Card({ title, sub, children, className = "", right }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[14px] font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-[12px] font-medium text-muted">{label}</div>
      <div className={`mt-1 text-[26px] font-semibold leading-tight tracking-tight ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</div>
      {note && <div className="mt-1 text-[12px] leading-snug text-ink-2">{note}</div>}
    </div>
  );
}

const STATUS: Record<CallStatus, { label: string; icon: string; cls: string }> = {
  QUALIFIED: { label: "Qualified", icon: "✓", cls: "bg-good-soft text-good" },
  NEEDS_INFO: { label: "Call back", icon: "↻", cls: "bg-warn-soft text-warn" },
  DISQUALIFIED: { label: "Not a fit", icon: "–", cls: "bg-page text-ink-2 border border-line" },
  ESCALATED: { label: "Escalated", icon: "!", cls: "bg-bad-soft text-bad" },
  PROCESSING: { label: "Processing", icon: "…", cls: "bg-info-soft text-info" },
  FAILED: { label: "Failed", icon: "×", cls: "bg-bad-soft text-bad" },
};

export function StatusChip({ status }: { status: CallStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
export const statusLabel = (s: CallStatus) => STATUS[s].label;

const VERDICT: Record<Verdict, { icon: string; cls: string; label: string }> = {
  pass: { icon: "✓", cls: "text-good", label: "Pass" },
  fail: { icon: "✕", cls: "text-bad", label: "Fail" },
  unclear: { icon: "?", cls: "text-warn", label: "Unclear" },
};
export function VerdictMark({ v }: { v: Verdict }) {
  const s = VERDICT[v];
  return (
    <span className={`inline-flex w-5 justify-center font-semibold ${s.cls}`} title={s.label} aria-label={s.label}>
      {s.icon}
    </span>
  );
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "accent" | "warn" | "bad" | "info" }) {
  const cls = { plain: "border border-line text-ink-2", accent: "bg-accent-soft text-accent", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", info: "bg-info-soft text-info" }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11.5px] ${cls}`}>{children}</span>;
}
