import { Simulator } from "./Simulator";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  const c = getConfig();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-[26px]">Test a call</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-2">
          Paste or pick a transcript and run it through exactly the workflow a Vaani call goes through: Gemini extraction, the rubric, booking, the Telegram handoff, HubSpot, and costs.
          {c.telegram === "live" ? " Telegram is live, so a real message will be sent." : " Telegram is in demo mode."}
        </p>
      </div>
      <Simulator />
    </div>
  );
}
