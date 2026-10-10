import "server-only";
import postgres from "postgres";
import type { CallRecord, CostRecord, EventRecord, LeadRecord } from "../types";
import type { CallRow, NewCall, Store } from "./types";

// prepare:false keeps it compatible with Supabase's transaction pooler (port 6543) and Neon's pooler.
const g = globalThis as unknown as { __aanganSql?: postgres.Sql };
const sql = () => (g.__aanganSql ??= postgres(process.env.DATABASE_URL!, { prepare: false, max: 3, idle_timeout: 20 }));

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? null : String(v).slice(0, 10));
const n = (v: unknown) => (v == null ? null : Number(v));
const json = (v: unknown) => sql().json(v as never);

const toCall = (r: Row): CallRecord => ({
  id: r.id as string,
  source: r.source as CallRecord["source"],
  vaani_event_id: (r.vaani_event_id as string) ?? null,
  vaani_call_id: (r.vaani_call_id as string) ?? null,
  caller_phone: (r.caller_phone as string) ?? null,
  start_time: iso(r.start_time)!,
  duration_sec: Number(r.duration_sec),
  after_hours: Boolean(r.after_hours),
  transcript: (r.transcript as CallRecord["transcript"]) ?? [],
  status: r.status as CallRecord["status"],
  intent: (r.intent as string) ?? null,
  linked_call_id: (r.linked_call_id as string) ?? null,
  error: (r.error as string) ?? null,
  created_at: iso(r.created_at)!,
  processed_at: iso(r.processed_at),
});

const toLead = (r: Row): LeadRecord => ({
  id: r.id as string,
  call_id: r.call_id as string,
  caller_name: (r.caller_name as string) ?? null,
  project_type: (r.project_type as string) ?? null,
  scope: (r.scope as string) ?? null,
  location: (r.location as string) ?? null,
  zone: r.zone as LeadRecord["zone"],
  carpet_area: n(r.carpet_area),
  timeline: (r.timeline as string) ?? null,
  needed_by: day(r.needed_by),
  budget: (r.budget as string) ?? null,
  budget_max_inr: n(r.budget_max_inr),
  decision_maker: (r.decision_maker as string) ?? null,
  status: r.status as LeadRecord["status"],
  priority: r.priority as LeadRecord["priority"],
  criteria: r.criteria as LeadRecord["criteria"],
  reasons: (r.reasons as string[]) ?? [],
  flags: (r.flags as string[]) ?? [],
  handoff_summary: (r.handoff_summary as string) ?? null,
  booking: (r.booking as LeadRecord["booking"]) ?? null,
  hubspot_deal_id: (r.hubspot_deal_id as string) ?? null,
  telegram_message_id: n(r.telegram_message_id),
  handoff_sent_at: iso(r.handoff_sent_at),
  assigned_to: (r.assigned_to as string) ?? null,
  assigned_at: iso(r.assigned_at),
  created_at: iso(r.created_at)!,
  extraction: (r.extraction as LeadRecord["extraction"]) ?? undefined,
});

const toCost = (r: Row): CostRecord => ({
  call_id: r.call_id as string,
  stt_cost: n(r.stt_cost),
  llm_cost: Number(r.llm_cost),
  tts_cost: n(r.tts_cost),
  voice_cost: Number(r.voice_cost),
  total_cost: Number(r.total_cost),
  llm_model: (r.llm_model as string) ?? null,
  llm_input_tokens: Number(r.llm_input_tokens),
  llm_output_tokens: Number(r.llm_output_tokens),
});

const JSON_COLS = new Set(["transcript", "criteria", "booking", "extraction", "raw_payload", "detail"]);
function prepare(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = JSON_COLS.has(k) && v !== null ? json(v) : v;
  }
  return out;
}

export class PostgresStore implements Store {
  async insertCall(c: NewCall) {
    const rows = await sql()`
      insert into calls ${sql()(prepare({ ...c, raw_payload: c.raw_payload ?? null }))}
      on conflict (vaani_event_id) do nothing
      returning *`;
    return rows[0] ? toCall(rows[0]) : null;
  }
  async updateCall(id: string, patch: Partial<CallRecord>) {
    const p = prepare(patch);
    if (Object.keys(p).length) await sql()`update calls set ${sql()(p)} where id = ${id}`;
  }
  async insertLead(l: Omit<LeadRecord, "id" | "created_at">) {
    const p = prepare(l as Record<string, unknown>);
    const rows = await sql()`
      insert into leads ${sql()(p)}
      on conflict (call_id) do update set ${sql()(p)}
      returning *`;
    return toLead(rows[0]);
  }
  async updateLead(id: string, patch: Partial<LeadRecord>) {
    const p = prepare(patch);
    if (Object.keys(p).length) await sql()`update leads set ${sql()(p)} where id = ${id}`;
  }
  async insertCost(c: CostRecord) {
    await sql()`insert into system_costs ${sql()(prepare(c as unknown as Record<string, unknown>))}
      on conflict (call_id) do update set llm_cost = excluded.llm_cost, voice_cost = excluded.voice_cost,
        total_cost = excluded.total_cost, llm_input_tokens = excluded.llm_input_tokens, llm_output_tokens = excluded.llm_output_tokens`;
  }
  async addEvent(e: Omit<EventRecord, "id" | "at">) {
    await sql()`insert into events ${sql()(prepare(e as Record<string, unknown>))}`;
  }
  async getCall(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [c] = await sql()`select * from calls where id = ${id}`;
    if (!c) return null;
    const [l] = await sql()`select * from leads where call_id = ${id}`;
    const [k] = await sql()`select * from system_costs where call_id = ${id}`;
    const ev = await sql()`select * from events where call_id = ${id} order by at, id`;
    return {
      call: toCall(c),
      lead: l ? toLead(l) : null,
      cost: k ? toCost(k) : null,
      events: ev.map((e) => ({ id: Number(e.id), call_id: e.call_id, kind: e.kind, ok: e.ok, detail: e.detail, at: iso(e.at)! })),
      raw_payload: c.raw_payload ?? null,
    };
  }
  async getLead(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [l] = await sql()`select * from leads where id = ${id}`;
    return l ? toLead(l) : null;
  }
  async listCalls(opts: { from?: Date; to?: Date; source?: CallRecord["source"] } = {}): Promise<CallRow[]> {
    const s = sql();
    const rows = await s`
      select c.id as c_id, row_to_json(c) as c, row_to_json(l) as l, row_to_json(k) as k
      from calls c
      left join leads l on l.call_id = c.id
      left join system_costs k on k.call_id = c.id
      where true
        ${opts.from ? s`and c.start_time >= ${opts.from}` : s``}
        ${opts.to ? s`and c.start_time < ${opts.to}` : s``}
        ${opts.source ? s`and c.source = ${opts.source}` : s``}
      order by c.start_time desc
      limit 2000`;
    return rows.map((r) => {
      const c = { ...(r.c as Row) };
      delete c.raw_payload;
      return { call: toCall(c), lead: r.l ? toLead(r.l as Row) : null, cost: r.k ? toCost(r.k as Row) : null };
    });
  }
  async recentCallsFrom(phone: string, since: Date) {
    const rows = await sql()`select * from calls where caller_phone = ${phone} and start_time >= ${since} order by start_time`;
    return rows.map(toCall);
  }
  async deleteBySource(source: CallRecord["source"]) {
    const rows = await sql()`delete from calls where source = ${source} returning id`;
    return rows.length;
  }
  async phoneForRoom(room: string) {
    const [r] = await sql()`select detail->>'phone_number' as phone from events
      where kind = 'vaani.call_started' and detail->>'room_name' = ${room} and detail ? 'phone_number' order by id desc limit 1`;
    return (r?.phone as string) ?? null;
  }
}
