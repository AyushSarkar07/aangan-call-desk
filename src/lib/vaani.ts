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

/** Real payloads nest every event's fields under `data` (the docs show some flat); read both. */
export const phoneOf = (e: VaaniEvent) => {
  const p = e.data?.phone_number ?? e.phone_number ?? e.data?.from_number ?? e.data?.caller_number ?? null;
  return p ? p.replace(/[^\d+]/g, "") || null : null;
};

/**
 * call_postprocessing → our call shape. The timestamp is when processing finished.
 * call_duration is documented in milliseconds but Vaani's own test event sends seconds (120),
 * so anything over two hours is read as milliseconds.
 */
export function normalisePostprocessing(e: VaaniEvent): NormalisedCall {
  const d = e.data ?? {};
  const room = roomOf(e) ?? "unknown";
  const raw = Number(d.call_duration ?? 0);
  const durationSec = Number.isFinite(raw) && raw > 0 ? Math.round(raw > 7200 ? raw / 1000 : raw) : 0;
  const finished = e.timestamp && !Number.isNaN(Date.parse(e.timestamp)) ? new Date(e.timestamp) : new Date();
  const phone = phoneOf(e);
  return {
    callId: d.call_id ?? e.call_id ?? room,
    room,
    phone,
    start: new Date(finished.getTime() - durationSec * 1000),
    durationSec,
    turns: parseTranscript(d.transcript),
    summary: d.summary ?? null,
    recordingUrl: d.recording_url ?? null,
  };
}
