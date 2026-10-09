"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SAMPLES } from "./samples";

export function Simulator() {
  const router = useRouter();
  const [text, setText] = useState(SAMPLES[0].text);
  const [phone, setPhone] = useState("+919000012345");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: text, phone, notify }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? `Failed (${res.status})`);
    router.push(`/calls/${json.call_id}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-1">
        <div className="text-[12px] font-medium text-muted">Scenarios</div>
        {SAMPLES.map((s) => (
          <button key={s.name} onClick={() => setText(s.text)} className={`block w-full rounded-lg border px-3 py-2 text-left text-[13px] ${text === s.text ? "border-accent bg-accent-soft text-accent" : "border-line bg-card hover:border-line-strong"}`}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="space-y-3 lg:col-span-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="w-full rounded-xl border border-line bg-card p-3 font-mono text-[12.5px] leading-relaxed"
          aria-label="Transcript"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-[13px] text-ink-2">
            Caller number{" "}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="ml-1 w-40 rounded-md border border-line bg-card px-2 py-1 font-mono text-[13px]" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Send Telegram, book and create CRM deal
          </label>
          <button onClick={run} disabled={busy} className="ml-auto rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60">
            {busy ? "Processing…" : "Run this call"}
          </button>
        </div>
        {error && <p className="text-[13px] text-bad">{error}</p>}
        <p className="text-[12px] text-muted">One line per turn, starting with “Agent:” or “Caller:”.</p>
      </div>
    </div>
  );
}
