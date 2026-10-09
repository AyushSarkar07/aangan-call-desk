"use client";
import { useState } from "react";

const SERIES = [
  { key: "QUALIFIED", label: "Qualified", color: "var(--s1)" },
  { key: "NEEDS_INFO", label: "Call back", color: "var(--s2)" },
  { key: "DISQUALIFIED", label: "Not a fit", color: "var(--s3)" },
  { key: "ESCALATED", label: "Escalated", color: "var(--s4)" },
] as const;

type Day = { date: string } & Record<(typeof SERIES)[number]["key"], number>;

/** Calls per day, stacked by outcome. Fixed series order and colours; hover shows the day's breakdown. */
export function DailyOutcomes({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!days.length) return <p className="py-8 text-center text-[13px] text-muted">No calls in this period yet.</p>;
  const W = 640;
  const H = 180;
  const padL = 24;
  const padB = 22;
  const max = Math.max(1, ...days.map((d) => SERIES.reduce((s, x) => s + d[x.key], 0)));
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.ceil(max / 2), max];
  const slot = (W - padL) / days.length;
  const bw = Math.min(28, Math.max(6, slot * 0.6));
  const y = (v: number) => H - padB - (v / max) * (H - padB - 8);
  const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const every = Math.ceil(days.length / 8);

  return (
    <div>
      <Legend />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calls per day by outcome">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)" className="tnum">{t}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            let acc = 0;
            const segs = SERIES.filter((s) => d[s.key] > 0);
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={padL + slot * i} y={0} width={slot} height={H - padB} fill={hover === i ? "var(--grid)" : "transparent"} opacity={0.5} />
                {segs.map((s, j) => {
                  const v = d[s.key];
                  const top = y(acc + v);
                  const bottom = y(acc);
                  acc += v;
                  const isTop = j === segs.length - 1;
                  const h = Math.max(1, bottom - top - (isTop ? 0 : 2));
                  return isTop ? (
                    <path key={s.key} d={roundedTop(cx - bw / 2, top, bw, h, Math.min(4, h))} fill={s.color} />
                  ) : (
                    <rect key={s.key} x={cx - bw / 2} y={top + 2} width={bw} height={h} fill={s.color} />
                  );
                })}
                {i % every === 0 && (
                  <text x={cx} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">{label(d.date)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hover != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[140px] rounded-lg border border-line bg-card px-3 py-2 text-[12px] shadow-md"
            style={{ left: `clamp(0px, calc(${((padL + slot * hover + slot / 2) / W) * 100}% - 70px), calc(100% - 150px))` }}
          >
            <div className="mb-1 font-medium">{label(days[hover].date)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-2"><Swatch color={s.color} />{s.label}</span>
                <span className="tnum font-medium">{days[hover][s.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

const Swatch = ({ color }: { color: string }) => <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />;

function Legend() {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5"><Swatch color={s.color} />{s.label}</span>
      ))}
    </div>
  );
}

/** Horizontal bars for a ranked list (funnel stages, decline reasons). One hue: it is magnitude, not identity. */
export function Bars({ rows, max, format = (n) => String(n) }: { rows: { label: string; value: number; note?: string }[]; max?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="relative">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="text-ink-2">{r.label}</span>
            <span className="tnum font-medium">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-page">
            <div className="h-2 rounded-full transition-[width]" style={{ width: `${(r.value / top) * 100}%`, background: "var(--s1)", opacity: hover == null || hover === i ? 1 : 0.55 }} />
          </div>
          {hover === i && r.note && <div className="mt-1 text-[11.5px] text-muted">{r.note}</div>}
        </div>
      ))}
    </div>
  );
}
