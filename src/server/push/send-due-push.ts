import webpush from "web-push";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildBrowserNotificationPayload, hasDueReminders } from "@/lib/due-reminders";
import { getDailyContext } from "@/server/tools/read";
import { getWebPushOptions, isWebPushConfigured } from "@/server/push/vapid-config";

function todayKeyInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function sendDueTaskWebPushIfNeeded(): Promise<{
  sent: boolean;
  message: string;
}> {
  if (!isWebPushConfigured()) {
    return { sent: false, message: "Web Push nicht konfiguriert (VAPID-Env)." };
  }

  const settings = await getSettings();
  if (!settings.notifyWebPushDueTasks) {
    return { sent: false, message: "Web-Push-Erinnerungen deaktiviert." };
  }

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) {
    return { sent: false, message: "Kein Push-Abonnement registriert." };
  }

  const todayKey = todayKeyInTimezone(settings.timezone);
  const row = await prisma.userSettings.findUniqueOrThrow({ where: { id: "default" } });
  if (row.lastDuePushDate === todayKey) {
    return { sent: false, message: "Heute bereits per Push erinnert." };
  }

  const ctx = await getDailyContext();
  if (!hasDueReminders(ctx.overdue, ctx.dueToday)) {
    return { sent: false, message: "Keine fälligen Aufgaben für Push." };
  }

  const { publicKey, privateKey, subject } = getWebPushOptions();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { title, body } = buildBrowserNotificationPayload(ctx.overdue, ctx.dueToday);
  const payload = JSON.stringify({ title, body, url: "/heute" });

  let sentCount = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sentCount += 1;
    } catch {
      await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
    }
  }

  if (sentCount > 0) {
    await prisma.userSettings.update({
      where: { id: "default" },
      data: { lastDuePushDate: todayKey },
    });
    return { sent: true, message: `Push an ${sentCount} Gerät(e) gesendet.` };
  }

  return { sent: false, message: "Push-Versand fehlgeschlagen (Abonnements ungültig?)." };
}
