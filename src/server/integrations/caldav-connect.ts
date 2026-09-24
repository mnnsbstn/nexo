import { saveCalDavCalendarConnection } from "@/server/integrations/calendar-connection";
import { verifyCalDavAccess } from "@/server/integrations/caldav";

export async function connectCalDav(input: {
  serverUrl: string;
  username: string;
  password: string;
}) {
  const calendarUrl = await verifyCalDavAccess({
    serverUrl: input.serverUrl,
    username: input.username,
    password: input.password,
  });

  await saveCalDavCalendarConnection({
    serverUrl: input.serverUrl.trim(),
    username: input.username.trim(),
    password: input.password.trim(),
    calendarUrl,
  });

  return { calendarUrl, username: input.username.trim() };
}
