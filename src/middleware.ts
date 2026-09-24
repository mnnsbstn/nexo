import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest, isAuthEnabled } from "@/lib/auth";

const PUBLIC_API = new Set(["/api/auth/login", "/api/auth/session"]);

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const authed = await getSessionFromRequest(request);

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.has(pathname)) {
      return NextResponse.next();
    }
    if (!authed) {
      return NextResponse.json(
        { error: "Nicht angemeldet. Bitte unter /anmelden einloggen." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/anmelden") {
    if (authed) {
      return NextResponse.redirect(new URL("/heute", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    const login = new URL("/anmelden", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
