import type { CallRecord, CostRecord, EventRecord, LeadRecord } from "../types";

export type NewCall = Omit<CallRecord, "id" | "created_at" | "processed_at" | "status" | "intent" | "linked_call_id" | "error"> & {
  raw_payload?: unknown;
};

export interface CallRow {
  call: CallRecord;
  lead: LeadRecord | null;
  cost: CostRecord | null;
}

export interface Store {
  /** Returns null when a call with the same vaani_event_id already exists (webhook retry). */
  insertCall(c: NewCall): Promise<CallRecord | null>;
  updateCall(id: string, patch: Partial<CallRecord>): Promise<void>;
  insertLead(l: Omit<LeadRecord, "id" | "created_at">): Promise<LeadRecord>;
  updateLead(id: string, patch: Partial<LeadRecord>): Promise<void>;
  insertCost(c: CostRecord): Promise<void>;
  addEvent(e: Omit<EventRecord, "id" | "at">): Promise<void>;
  getCall(id: string): Promise<(CallRow & { events: EventRecord[]; raw_payload: unknown }) | null>;
  getLead(id: string): Promise<LeadRecord | null>;
  listCalls(opts?: { from?: Date; to?: Date; source?: CallRecord["source"] }): Promise<CallRow[]>;
  recentCallsFrom(phone: string, since: Date): Promise<CallRecord[]>;
  deleteBySource(source: CallRecord["source"]): Promise<number>;
  /** Caller number from the vaani.call_started event for this room (the transcript event omits it). */
  phoneForRoom(room: string): Promise<string | null>;
}
