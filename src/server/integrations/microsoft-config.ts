import { getPublicBaseUrl } from "@/server/integrations/google-config";

export function getMicrosoftTenantId(): string {
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim();
  return tenant && tenant.length > 0 ? tenant : "common";
}

export function isMicrosoftCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() &&
      process.env.MICROSOFT_CLIENT_SECRET?.trim() &&
      getPublicBaseUrl(),
  );
}

export function microsoftRedirectUri(): string {
  const base = getPublicBaseUrl();
  if (!base) throw new Error("NEXO_PUBLIC_URL fehlt");
  return `${base}/api/integrations/calendar/microsoft/callback`;
}

export const MICROSOFT_CALENDAR_SCOPE =
  "offline_access openid profile email Calendars.ReadWrite User.Read";
