import Link from "next/link";
import { notFound } from "next/navigation";
import { CallDetail } from "@/components/CallDetail";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Direct link to one call (used by the "Open call & transcript" button in Telegram).
export default async function CallPage({ params }: PageProps<"/calls/[id]">) {
  const { id } = await params;
  const data = await getStore().getCall(id);
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/calls?id=${id}`} className="text-[12.5px] text-accent">← Call log</Link>
      <CallDetail call={data.call} lead={data.lead} cost={data.cost} events={data.events} raw={data.raw_payload} />
    </div>
  );
}
