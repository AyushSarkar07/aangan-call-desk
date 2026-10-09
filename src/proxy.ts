import { NextResponse, type NextRequest } from "next/server";
import { accessCodeEnabled, SESSION_COOKIE, verifySession } from "@/lib/access-code";

// Pages need the access-code session. Webhooks authenticate with their own signatures,
// and the other API routes check the session themselves (requireSession).
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/login") || path.startsWith("/auth/") || path.startsWith("/api/")) return NextResponse.next();
  // Locally, no code means open. In production, no code means locked (the login page explains).
  if (!accessCodeEnabled()) return process.env.NODE_ENV === "production" ? NextResponse.redirect(new URL("/login", request.url)) : NextResponse.next();
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
