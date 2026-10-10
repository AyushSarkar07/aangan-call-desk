import { redirect } from "next/navigation";
import { accessCodeEnabled, openAccess } from "@/lib/access-code";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: PageProps<"/login">) {
  if (openAccess()) redirect("/");
  if (!accessCodeEnabled()) {
    if (process.env.NODE_ENV !== "production") redirect("/");
    return <p className="py-20 text-center text-[14px] text-ink-2">Sign-in is not configured. Set ACCESS_CODE and SESSION_SECRET.</p>;
  }
  const { error } = await searchParams;
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <form action="/auth/code" method="post" className="w-full max-w-sm rounded-xl border border-line bg-card p-6">
        <div className="mb-5">
          <div className="font-serif text-[22px] font-semibold text-accent">Aangan</div>
          <div className="text-[14px] text-ink-2">Call Desk</div>
        </div>
        <label className="block text-[12px] font-medium text-muted">
          Access code
          <input name="code" required autoFocus autoComplete="current-password" autoCapitalize="none" spellCheck={false}
            className="mt-1 w-full rounded-md border border-line-strong bg-card px-2.5 py-2 font-mono text-[15px] text-ink" />
        </label>
        {error && <p className="mt-3 text-[12.5px] text-bad">That code didn&apos;t match. Try again.</p>}
        <button className="mt-5 w-full rounded-md bg-accent py-2 text-[13.5px] font-medium text-white">Enter</button>
        <p className="mt-3 text-[11.5px] text-muted">You stay signed in on this device for 30 days.</p>
      </form>
    </div>
  );
}
