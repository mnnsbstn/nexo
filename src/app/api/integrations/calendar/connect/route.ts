import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/server/integrations/google-oauth";
import { isGoogleCalendarOAuthConfigured } from "@/server/integrations/google-config";
import { createOAuthState } from "@/lib/oauth-state";

const STATE_COOKIE = "nexo_oauth_state";

export async function GET() {
  if (!isGoogleCalendarOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth nicht konfiguriert. Setze GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET und NEXO_PUBLIC_URL.",
      },
      { status: 503 },
    );
  }

  const state = await createOAuthState();
  const url = buildGoogleAuthUrl(state);
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
