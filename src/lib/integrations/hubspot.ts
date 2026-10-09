import "server-only";

// HubSpot free CRM: every qualified call becomes a contact + a deal at "Appointment scheduled".
const BASE = "https://api.hubapi.com";

async function hs<T>(path: string, body: unknown): Promise<{ status: number; json: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as T };
}

async function findOrCreateContact(name: string, phone: string | null): Promise<string> {
  if (phone) {
    const found = await hs<{ results?: { id: string }[] }>("/crm/v3/objects/contacts/search", {
      filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: phone }] }],
      limit: 1,
    });
    if (found.json.results?.[0]) return found.json.results[0].id;
  }
  const [firstname, ...rest] = name.split(" ");
  const created = await hs<{ id?: string; message?: string }>("/crm/v3/objects/contacts", {
    properties: { firstname, lastname: rest.join(" ") || undefined, phone: phone ?? undefined, hs_lead_status: "NEW" },
  });
  if (!created.json.id) throw new Error(`HubSpot contact: ${created.json.message ?? created.status}`);
  return created.json.id;
}

export async function createDeal(opts: { name: string; phone: string | null; dealName: string; amountInr: number | null; stage: string; description: string }) {
  const contactId = await findOrCreateContact(opts.name, opts.phone);
  const deal = await hs<{ id?: string; message?: string }>("/crm/v3/objects/deals", {
    properties: {
      dealname: opts.dealName,
      pipeline: "default",
      dealstage: opts.stage,
      ...(opts.amountInr ? { amount: String(opts.amountInr) } : {}),
      description: opts.description.slice(0, 5000),
    },
    // 3 = HubSpot-defined association "deal to contact".
    associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }],
  });
  if (!deal.json.id) throw new Error(`HubSpot deal: ${deal.json.message ?? deal.status}`);
  return deal.json.id;
}
