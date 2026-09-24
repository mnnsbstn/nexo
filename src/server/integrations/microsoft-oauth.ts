import {
  getMicrosoftTenantId,
  isMicrosoftCalendarOAuthConfigured,
  microsoftRedirectUri,
  MICROSOFT_CALENDAR_SCOPE,
} from "@/server/integrations/microsoft-config";

function tokenUrl() {
  return `https://login.microsoftonline.com/${getMicrosoftTenantId()}/oauth2/v2.0/token`;
}

function authUrl() {
  return `https://login.microsoftonline.com/${getMicrosoftTenantId()}/oauth2/v2.0/authorize`;
}

export function buildMicrosoftAuthUrl(state: string): string {
  if (!isMicrosoftCalendarOAuthConfigured()) {
    throw new Error("Microsoft OAuth ist nicht konfiguriert.");
  }
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    response_type: "code",
    redirect_uri: microsoftRedirectUri(),
    response_mode: "query",
    scope: MICROSOFT_CALENDAR_SCOPE,
    state,
    prompt: "consent",
  });
  return `${authUrl()}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function parseTokenResponse(data: TokenResponse) {
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Kein Access Token.");
  }
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

export async function exchangeMicrosoftAuthCode(code: string) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
    grant_type: "authorization_code",
    code,
    redirect_uri: microsoftRedirectUri(),
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok) {
    throw new Error(`Microsoft Token-Austausch fehlgeschlagen: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return parseTokenResponse(data);
}

export async function refreshMicrosoftAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MICROSOFT_CALENDAR_SCOPE,
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok) {
    throw new Error(`Microsoft Token-Refresh fehlgeschlagen: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return parseTokenResponse(data);
}

export async function fetchMicrosoftAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
  return data.mail ?? data.userPrincipalName ?? null;
}
