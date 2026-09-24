import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exchangeGoogleAuthCode } from "@/server/integrations/google-oauth";
import { saveGoogleCalendarConnection } from "@/server/integrations/calendar-connection";
import { verifyOAuthState } from "@/lib/oauth-state";

const STATE_COOKIE = "nexo_oauth_state";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/einstellungen?calendar=error&reason=${encodeURIComponent(error)}`, url.origin),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/einstellungen?calendar=error&reason=state", url.origin));
  }

  const valid = await verifyOAuthState(state);
  if (!valid) {
    return NextResponse.redirect(new URL("/einstellungen?calendar=error&reason=state", url.origin));
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code);
    await saveGoogleCalendarConnection({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    const res = NextResponse.redirect(new URL("/einstellungen?calendar=connected", url.origin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/einstellungen?calendar=error&reason=token", url.origin));
  }
}
