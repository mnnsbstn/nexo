import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalCalendarDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";

export type CalendarDraftInput = z.infer<typeof externalCalendarDraftPayloadSchema>;

export function getCalendarIntegrationStatus(settings: AppSettings) {
  return {
    enabled: settings.calendarIntegrationEnabled,
    connected: false,
    provider: null as string | null,
    message: settings.calendarIntegrationEnabled
      ? "Kalender-Entwürfe sind aktiv — OAuth/Export folgt in einem späteren Schritt."
      : "Kalender-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.",
  };
}

export async function listCalendarDrafts(limit = 20) {
  return prisma.externalCalendarDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function persistCalendarDraft(
  data: CalendarDraftInput,
  proposalId: string,
) {
  return prisma.externalCalendarDraft.create({
    data: {
      title: data.title,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      description: data.description ?? null,
      timezone: data.timezone ?? null,
      status: "draft",
      proposalId,
    },
  });
}
