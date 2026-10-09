"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReplayButton({ label = "Replay September's calls" }: { label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function run() {
    setState("busy");
    setMsg("Reading 21 calls with Gemini. About a minute.");
    const res = await fetch("/api/replay", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("error");
      setMsg(json.error ?? `Failed (${res.status})`);
      return;
    }
    setState("idle");
    setMsg("");
    router.push("/calibration");
    router.refresh();
  }
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button onClick={run} disabled={state === "busy"} className="rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white disabled:opacity-60">
        {state === "busy" ? "Replaying…" : label}
      </button>
      {msg && <span className={`text-[12px] ${state === "error" ? "text-bad" : "text-muted"}`}>{msg}</span>}
    </div>
  );
}
