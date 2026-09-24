import {
  disconnectCalendar,
  saveICloudCalendarConnection,
} from "@/server/integrations/calendar-connection";
import {
  disconnectEmail,
  saveICloudEmailConnection,
} from "@/server/integrations/email-connection";
import { verifyICloudCalendarAccess } from "@/server/integrations/icloud-caldav";

export async function connectICloud(input: { appleId: string; appPassword: string }) {
  const calendarUrl = await verifyICloudCalendarAccess({
    appleId: input.appleId,
    appPassword: input.appPassword,
  });

  await saveICloudCalendarConnection({
    appleId: input.appleId,
    appPassword: input.appPassword,
    calendarUrl,
  });

  await saveICloudEmailConnection({
    appleId: input.appleId,
    appPassword: input.appPassword,
  });

  return { calendarUrl, appleId: input.appleId };
}

export async function disconnectICloud() {
  await disconnectCalendar();
  await disconnectEmail();
}
