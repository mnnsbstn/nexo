export function getPublicBaseUrl(): string | null {
  const explicit = process.env.NEXO_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return null;
}

export function isGoogleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      getPublicBaseUrl(),
  );
}

export function googleRedirectUri(): string {
  const base = getPublicBaseUrl();
  if (!base) throw new Error("NEXO_PUBLIC_URL fehlt");
  return `${base}/api/integrations/calendar/callback`;
}

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
