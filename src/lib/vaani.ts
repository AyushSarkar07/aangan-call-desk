import { createHmac, timingSafeEqual } from "node:crypto";
import { parseTranscript } from "./transcript";
import type { Turn } from "./types";

/** X-VaaniVoice-Signature: "sha256=<hex>" = HMAC-SHA256(raw body, vv_whk_ secret). */
export function verifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`);
  const given = Buffer.from(header.trim());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface VaaniEnvelope {
  id?: string;
  type?: string;
  created?: number;
  data?: unknown;
}

export interface NormalisedCall {
  eventId: string | null;
  callId: string | null;
  phone: string | null;
  start: Date;
  durationSec: number;
  turns: Turn[];
  missing: string[];
}

// Vaani documents the envelope but not the fields inside `data` ("no sub-field is guaranteed"),
// so look for each value under the names voice platforms commonly use, anywhere in the object.
const KEYS = {
  transcript: ["transcript", "transcription", "messages", "conversation", "turns", "dialogue", "chat_history", "history"],
  phone: ["caller_number", "from_number", "customer_number", "phone_number", "caller", "from", "phone", "mobile", "number"],
  duration: ["duration_sec", "duration_seconds", "call_duration", "duration", "billable_seconds", "seconds"],
  callId: ["call_id", "callId", "session_id", "sessionId", "conversation_id", "call_sid", "id"],
  start: ["started_at", "start_time", "startTime", "created_at", "createdAt", "timestamp"],
};

function find(obj: unknown, names: string[], depth = 0): unknown {
  if (!obj || typeof obj !== "object" || depth > 4) return undefined;
  const o = obj as Record<string, unknown>;
  for (const n of names) if (o[n] != null && o[n] !== "") return o[n];
  for (const v of Object.values(o)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const hit = find(v, names, depth + 1);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

function toDate(v: unknown, fallback: Date): Date {
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v);
  return fallback;
}

export function normalise(env: VaaniEnvelope): NormalisedCall {
  const data = env.data ?? {};
  const missing: string[] = [];
  const rawTranscript = find(data, KEYS.transcript);
  const turns = parseTranscript(rawTranscript);
  if (!turns.length) missing.push("transcript");
  const phoneRaw = find(data, KEYS.phone);
  const phone = typeof phoneRaw === "string" || typeof phoneRaw === "number" ? String(phoneRaw).replace(/[^\d+*xX]/g, "") || null : null;
  if (!phone) missing.push("caller_phone");
  let durationSec = Number(find(data, KEYS.duration) ?? 0);
  if (!Number.isFinite(durationSec) || durationSec < 0) durationSec = 0;
  if (durationSec > 10_000) durationSec = Math.round(durationSec / 1000); // milliseconds
  if (!durationSec) missing.push("duration");
  const created = env.created ? new Date(env.created * 1000) : new Date();
  const start = toDate(find(data, KEYS.start), new Date(created.getTime() - durationSec * 1000));
  const callId = find(data, KEYS.callId);
  return {
    eventId: env.id ?? null,
    callId: callId != null ? String(callId) : null,
    phone,
    start,
    durationSec: Math.round(durationSec),
    turns,
    missing,
  };
}
