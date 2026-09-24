import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  exchangeMicrosoftAuthCode,
  fetchMicrosoftAccountEmail,
} from "@/server/integrations/microsoft-oauth";
import { saveMicrosoftCalendarConnection } from "@/server/integrations/calendar-connection";
import { verifyOAuthState } from "@/lib/oauth-state";

const STATE_COOKIE = "nexo_oauth_ms_state";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/einstellungen?calendar=ms_error&reason=${encodeURIComponent(error)}`, url.origin),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/einstellungen?calendar=ms_error&reason=state", url.origin),
    );
  }

  const valid = await verifyOAuthState(state);
  if (!valid) {
    return NextResponse.redirect(
      new URL("/einstellungen?calendar=ms_error&reason=state", url.origin),
    );
  }

  try {
    const tokens = await exchangeMicrosoftAuthCode(code);
    const accountEmail = await fetchMicrosoftAccountEmail(tokens.accessToken);
    await saveMicrosoftCalendarConnection({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      accountEmail,
    });
    const res = NextResponse.redirect(new URL("/einstellungen?calendar=ms_connected", url.origin));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    return NextResponse.redirect(
      new URL("/einstellungen?calendar=ms_error&reason=token", url.origin),
    );
  }
}
