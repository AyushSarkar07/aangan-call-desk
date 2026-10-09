import "server-only";
import type { Booking } from "../types";

// Cal.com API v2. The voice agent captures a day/time preference on the call (Vaani cannot call
// external tools mid-call), and this books the first free slot that matches it.
const BASE = "https://api.cal.com/v2";
const TZ = "Asia/Kolkata";

type Pref = { days: number[] | null; from: number; to: number };

/** "Saturday morning", "weekdays after 6pm or weekends", "early next week" → allowed weekdays and IST hours. */
export function parsePreference(text: string | null): Pref {
  const t = (text ?? "").toLowerCase();
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let days: number[] | null = null;
  const named = names.map((n, i) => (t.includes(n) ? i : -1)).filter((i) => i >= 0);
  if (named.length) days = named;
  if (/weekend/.test(t)) days = [...(days ?? []), 0, 6];
  if (/weekday/.test(t)) days = [...(days ?? []), 1, 2, 3, 4, 5];
  let from = 10;
  let to = 19;
  if (/morning/.test(t)) [from, to] = [9, 12];
  else if (/afternoon/.test(t)) [from, to] = [12, 17];
  else if (/evening|after\s*(5|6|7)/.test(t)) [from, to] = [17, 21];
  return { days, from, to };
}

const istParts = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600e3);
  return { day: d.getUTCDay(), hour: d.getUTCHours() + d.getUTCMinutes() / 60 };
};

export function pickSlot(slots: string[], pref: Pref, notBefore: Date): string | null {
  const ok = slots.filter((s) => {
    if (new Date(s) < notBefore) return false;
    const { day, hour } = istParts(s);
    return (!pref.days || pref.days.includes(day)) && hour >= pref.from && hour < pref.to;
  });
  return ok[0] ?? slots.find((s) => new Date(s) >= notBefore) ?? null;
}

/** Without Cal.com keys: hold the next matching slot on a 10:00-19:00 grid, clearly labelled simulated. */
export function simulatedBooking(preference: string | null, now: Date): Booking {
  const pref = parsePreference(preference);
  const slots: string[] = [];
  for (let d = 1; d <= 14; d++) {
    for (const h of [10, 11.5, 15, 17.5, 18.5]) {
      const ist = new Date(now.getTime() + 5.5 * 3600e3);
      ist.setUTCDate(ist.getUTCDate() + d);
      ist.setUTCHours(Math.floor(h), (h % 1) * 60, 0, 0);
      slots.push(new Date(ist.getTime() - 5.5 * 3600e3).toISOString());
    }
  }
  const start = pickSlot(slots, pref, new Date(now.getTime() + 18 * 3600e3)) ?? slots[0];
  return { provider: "simulated", id: null, start, status: "held", note: "Calendar not connected; slot held for the designer to confirm." };
}

async function cal<T>(path: string, version: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.CAL_API_KEY}`, "cal-api-version": version, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as { status?: string; data?: T; error?: { message?: string } };
  if (!res.ok || json.status === "error") throw new Error(`Cal.com ${path}: ${json.error?.message ?? res.status}`);
  return json.data as T;
}

export async function bookConsultation(opts: { name: string; phone: string | null; preference: string | null; notes: string; now: Date }): Promise<Booking> {
  const eventTypeId = Number(process.env.CAL_EVENT_TYPE_ID);
  const start = new Date(opts.now.getTime() + 18 * 3600e3);
  const end = new Date(opts.now.getTime() + 14 * 864e5);
  const qs = new URLSearchParams({ eventTypeId: String(eventTypeId), start: start.toISOString(), end: end.toISOString(), timeZone: TZ });
  const data = await cal<Record<string, { start: string }[]>>(`/slots?${qs}`, "2024-09-04");
  const slots = Object.values(data).flat().map((s) => s.start).sort();
  const slot = pickSlot(slots, parsePreference(opts.preference), start);
  if (!slot) return { provider: "cal.com", id: null, start: start.toISOString(), status: "failed", note: "No free slots in the next 14 days." };
  // Callers rarely give an email on the phone; the booking goes to the studio's leads inbox and the
  // designer confirms by phone. Phone number is stored on the booking.
  const booked = await cal<{ uid: string; start: string }>("/bookings", "2024-08-13", {
    method: "POST",
    body: JSON.stringify({
      start: slot,
      eventTypeId,
      attendee: {
        name: opts.name,
        email: process.env.CAL_ATTENDEE_EMAIL ?? "leads@aangan.studio",
        timeZone: TZ,
        ...(opts.phone && /^\+\d{8,15}$/.test(opts.phone) ? { phoneNumber: opts.phone } : {}),
      },
      metadata: { source: "aangan-call-desk", phone: opts.phone ?? "withheld" },
      bookingFieldsResponses: { notes: opts.notes.slice(0, 900) },
    }),
  });
  return { provider: "cal.com", id: booked.uid, start: booked.start ?? slot, status: "booked" };
}
