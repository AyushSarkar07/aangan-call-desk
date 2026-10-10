import { createHash, timingSafeEqual } from "node:crypto";
import { parseTranscript } from "./transcript";
import type { Turn } from "./types";

// Vaani (vaanivoice.ai) webhooks: https://docs.vaanivoice.ai/guides/webhook-setup
// Vaani does not sign webhooks, so the URL carries a secret: /api/vaani/webhook?token=<VAANI_WEBHOOK_SECRET>.
export function tokenMatches(given: string | null, secret: string): boolean {
  if (!given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/** Flat lifecycle events (call_started, call_ended, ...) and the nested call_postprocessing event. */
export interface VaaniEvent {
  event?: string;
  call_id?: string;
  room_name?: string;
  timestamp?: string;
  phone_number?: string;
  call_duration?: number;
  data?: {
    room_name?: string;
    call_id?: string;
    call_duration?: number; // milliseconds in call_postprocessing
    end_reason?: string;
    summary?: string;
    entities?: Record<string, unknown>;
    dispositions?: Record<string, unknown>;
    recording_url?: string;
    transcript?: unknown;
    phone_number?: string;
    from_number?: string;
    caller_number?: string;
  };
}

export interface NormalisedCall {
  callId: string;
  room: string;
  phone: string | null;
  start: Date;
  durationSec: number;
  turns: Turn[];
  summary: string | null;
  recordingUrl: string | null;
}

export const roomOf = (e: VaaniEvent) => e.data?.room_name ?? e.room_name ?? e.data?.call_id ?? e.call_id ?? null;

/** call_postprocessing → our call shape. Duration arrives in milliseconds; the timestamp is when processing finished. */
export function normalisePostprocessing(e: VaaniEvent): NormalisedCall {
  const d = e.data ?? {};
  const room = roomOf(e) ?? "unknown";
  const ms = Number(d.call_duration ?? 0);
  const durationSec = Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : 0;
  const finished = e.timestamp && !Number.isNaN(Date.parse(e.timestamp)) ? new Date(e.timestamp) : new Date();
  const phone = d.phone_number ?? d.from_number ?? d.caller_number ?? null;
  return {
    callId: d.call_id ?? e.call_id ?? room,
    room,
    phone: phone ? phone.replace(/[^\d+]/g, "") || null : null,
    start: new Date(finished.getTime() - durationSec * 1000),
    durationSec,
    turns: parseTranscript(d.transcript),
    summary: d.summary ?? null,
    recordingUrl: d.recording_url ?? null,
  };
}
