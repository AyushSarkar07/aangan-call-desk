import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessCodeEnabled, SESSION_COOKIE, verifySession } from "./access-code";

/** For API routes: null when signed in (or sign-in is off locally), else a 401 response. */
export async function requireSession(): Promise<NextResponse | null> {
  if (!accessCodeEnabled()) {
    return process.env.NODE_ENV === "production" ? NextResponse.json({ error: "ACCESS_CODE not configured" }, { status: 503 }) : null;
  }
  const ok = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return ok ? null : NextResponse.json({ error: "Sign in first" }, { status: 401 });
}
