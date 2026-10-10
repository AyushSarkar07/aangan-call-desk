import { describe, expect, it } from "vitest";
import { normalisePostprocessing, phoneOf, roomOf, tokenMatches } from "@/lib/vaani";

// Verbatim shape from https://docs.vaanivoice.ai/guides/webhook-setup (call_postprocessing).
const sample = {
  event: "call_postprocessing",
  call_id: "outbound-1784899978-36cec598",
  timestamp: "2026-07-24T13:34:22.278854+00:00",
  data: {
    room_name: "outbound-1784899978-36cec598",
    call_id: "outbound-1784899978-36cec598",
    call_duration: 55150.022999999994,
    end_reason: "Call ended",
    summary: "The user called to have their name recorded.",
    entities: { name: "Ayush Awasthi" },
    dispositions: { acas: "Name Collected" },
    recording_url: "https://uat.vaaniresearch.com/api/stream/outbound-1784899978-36cec598",
    transcript:
      "[13:33:14] AGENT: Hi! you have reached our customer service.\n\n[13:33:19] USER: Yeah. How are you?\n\n[13:33:31] AGENT: I am doing great, thank you for asking!",
  },
};

describe("vaani webhook", () => {
  it("parses call_postprocessing: timestamped turns, ms duration, start time", () => {
    const n = normalisePostprocessing(sample);
    expect(n.turns).toEqual([
      { speaker: "agent", text: "Hi! you have reached our customer service." },
      { speaker: "caller", text: "Yeah. How are you?" },
      { speaker: "agent", text: "I am doing great, thank you for asking!" },
    ]);
    expect(n.durationSec).toBe(55);
    expect(n.start.toISOString()).toBe("2026-07-24T13:33:27.278Z");
    expect(n.callId).toBe("outbound-1784899978-36cec598");
    expect(n.phone).toBeNull();
  });
  it("reads Vaani's real nested shape (from its Test Connectivity event)", () => {
    const started = { event: "call_started", timestamp: "2026-10-10T05:32:36Z", data: { call_id: "r1", room_name: "r1", call_type: "Inbound", phone_number: "+91 98765 43210" } };
    expect(roomOf(started)).toBe("r1");
    expect(phoneOf(started)).toBe("+919876543210");
    const pp = { event: "call_postprocessing", call_id: "r1", timestamp: "2026-10-10T05:32:36Z", data: { call_id: "r1", room_name: "r1", call_duration: 120, transcript: "Agent: Hello\nUser: Hi" } };
    const n = normalisePostprocessing(pp);
    expect(n.durationSec).toBe(120);
    expect(n.turns).toEqual([{ speaker: "agent", text: "Hello" }, { speaker: "caller", text: "Hi" }]);
  });
  it("finds the room on flat and nested events", () => {
    expect(roomOf({ event: "call_started", room_name: "room_1", phone_number: "+91" })).toBe("room_1");
    expect(roomOf(sample)).toBe("outbound-1784899978-36cec598");
  });
  it("checks the URL token", () => {
    expect(tokenMatches("abc", "abc")).toBe(true);
    expect(tokenMatches("abd", "abc")).toBe(false);
    expect(tokenMatches(null, "abc")).toBe(false);
  });
});
