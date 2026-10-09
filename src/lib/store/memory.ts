import { randomUUID } from "node:crypto";
import type { CallRecord, CostRecord, EventRecord, LeadRecord } from "../types";
import type { NewCall, Store } from "./types";

interface Db {
  calls: (CallRecord & { raw_payload?: unknown })[];
  leads: LeadRecord[];
  costs: CostRecord[];
  events: EventRecord[];
}

// Survives Next.js dev hot reloads. Not durable: use DATABASE_URL anywhere that matters.
const g = globalThis as unknown as { __aanganDb?: Db };
const db = (g.__aanganDb ??= { calls: [], leads: [], costs: [], events: [] });

export class MemoryStore implements Store {
  async insertCall(c: NewCall) {
    if (c.vaani_event_id && db.calls.some((x) => x.vaani_event_id === c.vaani_event_id)) return null;
    const row: CallRecord & { raw_payload?: unknown } = {
      ...c,
      id: randomUUID(),
      status: "PROCESSING",
      intent: null,
      linked_call_id: null,
      error: null,
      created_at: new Date().toISOString(),
      processed_at: null,
    };
    db.calls.push(row);
    return row;
  }
  async updateCall(id: string, patch: Partial<CallRecord>) {
    const c = db.calls.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  }
  async insertLead(l: Omit<LeadRecord, "id" | "created_at">) {
    const row = { ...l, id: randomUUID(), created_at: new Date().toISOString() };
    db.leads = db.leads.filter((x) => x.call_id !== l.call_id);
    db.leads.push(row);
    return row;
  }
  async updateLead(id: string, patch: Partial<LeadRecord>) {
    const l = db.leads.find((x) => x.id === id);
    if (l) Object.assign(l, patch);
  }
  async insertCost(c: CostRecord) {
    db.costs = db.costs.filter((x) => x.call_id !== c.call_id);
    db.costs.push(c);
  }
  async addEvent(e: Omit<EventRecord, "id" | "at">) {
    db.events.push({ ...e, id: db.events.length + 1, at: new Date().toISOString() });
  }
  async getCall(id: string) {
    const call = db.calls.find((x) => x.id === id);
    if (!call) return null;
    return {
      call,
      lead: db.leads.find((l) => l.call_id === id) ?? null,
      cost: db.costs.find((c) => c.call_id === id) ?? null,
      events: db.events.filter((e) => e.call_id === id),
      raw_payload: call.raw_payload ?? null,
    };
  }
  async getLead(id: string) {
    return db.leads.find((l) => l.id === id) ?? null;
  }
  async listCalls(opts: { from?: Date; to?: Date; source?: CallRecord["source"] } = {}) {
    return db.calls
      .filter((c) => (!opts.from || new Date(c.start_time) >= opts.from) && (!opts.to || new Date(c.start_time) < opts.to) && (!opts.source || c.source === opts.source))
      .sort((a, b) => b.start_time.localeCompare(a.start_time))
      .map((call) => ({ call, lead: db.leads.find((l) => l.call_id === call.id) ?? null, cost: db.costs.find((c) => c.call_id === call.id) ?? null }));
  }
  async recentCallsFrom(phone: string, since: Date) {
    return db.calls.filter((c) => c.caller_phone === phone && new Date(c.start_time) >= since);
  }
  async deleteBySource(source: CallRecord["source"]) {
    const ids = new Set(db.calls.filter((c) => c.source === source).map((c) => c.id));
    db.calls = db.calls.filter((c) => !ids.has(c.id));
    db.leads = db.leads.filter((l) => !ids.has(l.call_id));
    db.costs = db.costs.filter((c) => !ids.has(c.call_id));
    db.events = db.events.filter((e) => !e.call_id || !ids.has(e.call_id));
    return ids.size;
  }
}
