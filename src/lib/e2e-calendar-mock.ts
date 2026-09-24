/** Nur für Playwright/CI — niemals in produktivem Hosting setzen. */
export function isE2eCalendarMockEnabled(): boolean {
  return process.env.NEXO_E2E_CALENDAR_MOCK === "1";
}
