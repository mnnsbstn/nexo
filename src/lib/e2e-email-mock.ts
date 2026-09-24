/** Nur für Playwright/CI — niemals in produktivem Hosting setzen. */
export function isE2eEmailMockEnabled(): boolean {
  return process.env.NEXO_E2E_EMAIL_MOCK === "1";
}
