import { exportDraftToExternalCalendar } from "@/server/integrations/calendar-export";

export { createGoogleCalendarEvent } from "@/server/integrations/google-calendar-event";

/** @deprecated Use exportDraftToExternalCalendar — behält Tests/API-Kompatibilität. */
export async function exportDraftToGoogle(draftId: string) {
  return exportDraftToExternalCalendar(draftId);
}
