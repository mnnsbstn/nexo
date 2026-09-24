import { NextResponse } from "next/server";
import { buildMicrosoftAuthUrl } from "@/server/integrations/microsoft-oauth";
import { isMicrosoftCalendarOAuthConfigured } from "@/server/integrations/microsoft-config";
import { createOAuthState } from "@/lib/oauth-state";

const STATE_COOKIE = "nexo_oauth_ms_state";

export async function GET() {
  if (!isMicrosoftCalendarOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Microsoft OAuth nicht konfiguriert. Setze MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET und NEXO_PUBLIC_URL.",
      },
      { status: 503 },
    );
  }

  const state = await createOAuthState();
  const url = buildMicrosoftAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
