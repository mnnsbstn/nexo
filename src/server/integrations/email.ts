import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalEmailDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";

export type EmailDraftInput = z.infer<typeof externalEmailDraftPayloadSchema>;

export async function getEmailIntegrationStatus(settings: AppSettings) {
  const enabled = settings.emailIntegrationEnabled;
  const message = enabled
    ? "E-Mail-Entwürfe aktiv — nach Freigabe wird nur ein Entwurf in Nexo gespeichert (kein Versand)."
    : "E-Mail-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.";

  return {
    enabled,
    sendConfigured: false,
    message,
  };
}

export async function listEmailDrafts(limit = 20) {
  return prisma.externalEmailDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function parseRecipientsJson(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function persistEmailDraft(data: EmailDraftInput, proposalId: string) {
  return prisma.externalEmailDraft.create({
    data: {
      toJson: JSON.stringify(data.to),
      ccJson: data.cc?.length ? JSON.stringify(data.cc) : null,
      subject: data.subject,
      body: data.body,
      status: "draft",
      proposalId,
    },
  });
}

export async function finalizeEmailDraft(draftId: string): Promise<{
  saved: boolean;
  sent: boolean;
  message: string;
}> {
  const draft = await prisma.externalEmailDraft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return { saved: false, sent: false, message: "Entwurf nicht gefunden." };
  }

  const message =
    "E-Mail-Entwurf in Nexo gespeichert — **kein Versand** (Beta). SMTP/API folgt in einem späteren Schritt.";

  await prisma.externalEmailDraft.update({
    where: { id: draftId },
    data: {
      status: "saved",
      savedNote: message,
    },
  });

  return { saved: true, sent: false, message };
}
