import {
  googleRedirectUri,
  GOOGLE_CALENDAR_SCOPE,
  isGoogleCalendarOAuthConfigured,
} from "@/server/integrations/google-config";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function buildGoogleAuthUrl(state: string): string {
  if (!isGoogleCalendarOAuthConfigured()) {
    throw new Error("Google OAuth ist nicht konfiguriert.");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
};

export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Token-Austausch fehlgeschlagen: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as TokenResponse;
  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date | null;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Token-Refresh fehlgeschlagen: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as TokenResponse;
  const expiresAt =
    typeof data.expires_in === "number"
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
  return { accessToken: data.access_token, expiresAt };
}
