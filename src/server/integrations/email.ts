import { prisma } from "@/lib/db";
import type { AppSettings } from "@/lib/settings";
import type { externalEmailDraftPayloadSchema } from "@/server/schemas/actions";
import type { z } from "zod";
import { isE2eEmailMockEnabled } from "@/lib/e2e-email-mock";
import { getEmailConnection } from "@/server/integrations/email-connection";
import { isEmailSendConfigured, isSmtpSendConfigured } from "@/server/integrations/smtp-config";
import { sendViaSmtp } from "@/server/integrations/smtp-send";

export type EmailDraftInput = z.infer<typeof externalEmailDraftPayloadSchema>;

export async function getEmailIntegrationStatus(settings: AppSettings) {
  const enabled = settings.emailIntegrationEnabled;
  const icloudMail = await getEmailConnection();
  const icloudConnected = icloudMail?.provider === "icloud";
  const sendConfigured =
    (await isEmailSendConfigured()) || isE2eEmailMockEnabled();
  let message: string;
  if (!enabled) {
    message =
      "E-Mail-Integration ist aus. In Einstellungen aktivieren, um Entwürfe per Freigabe zu speichern.";
  } else if (!sendConfigured) {
    message =
      "E-Mail-Entwürfe aktiv — Versand per SMTP in .env oder iCloud (Apple-ID + App-Passwort) in Einstellungen; Senden nur manuell.";
  } else if (icloudConnected && !isSmtpSendConfigured()) {
    message = `E-Mail-Entwürfe aktiv — iCloud Mail verbunden${icloudMail?.accountEmail ? ` (${icloudMail.accountEmail})` : ""}. Versand nur manuell pro Entwurf.`;
  } else {
    message =
      "E-Mail-Entwürfe aktiv — Versand konfiguriert (SMTP/.env oder iCloud). Nur manuell pro Entwurf in Einstellungen.";
  }

  return {
    enabled,
    sendConfigured,
    icloudConnected,
    icloudAccountEmail: icloudConnected ? icloudMail?.accountEmail ?? null : null,
    smtpFromEnv: isSmtpSendConfigured(),
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

  const sendConfigured = (await isEmailSendConfigured()) || isE2eEmailMockEnabled();
  const message = sendConfigured
    ? "E-Mail-Entwurf gespeichert. Versand erst nach manuellem „Senden“ in Einstellungen."
    : "E-Mail-Entwurf in Nexo gespeichert — kein SMTP konfiguriert, daher kein Versand.";

  await prisma.externalEmailDraft.update({
    where: { id: draftId },
    data: {
      status: "saved",
      savedNote: message,
    },
  });

  return { saved: true, sent: false, message };
}

export async function sendEmailDraft(draftId: string): Promise<{
  sent: boolean;
  message: string;
  messageId?: string;
}> {
  if (!(await isEmailSendConfigured()) && !isE2eEmailMockEnabled()) {
    return {
      sent: false,
      message:
        "Kein Versand konfiguriert. SMTP in .env (SMTP_HOST, SMTP_FROM) oder iCloud in Einstellungen verbinden.",
    };
  }

  const draft = await prisma.externalEmailDraft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return { sent: false, message: "Entwurf nicht gefunden." };
  }
  if (draft.status === "sent") {
    return { sent: false, message: "Diese E-Mail wurde bereits gesendet." };
  }
  if (draft.status !== "saved") {
    return {
      sent: false,
      message: "Nur gespeicherte Entwürfe können gesendet werden (zuerst Chat-Freigabe).",
    };
  }

  const to = parseRecipientsJson(draft.toJson);
  const cc = draft.ccJson ? parseRecipientsJson(draft.ccJson) : [];

  try {
    const { messageId } = await sendViaSmtp({
      to,
      cc,
      subject: draft.subject,
      text: draft.body,
    });
    await prisma.externalEmailDraft.update({
      where: { id: draftId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sendError: null,
        externalMessageId: messageId,
      },
    });
    return { sent: true, message: "E-Mail wurde versendet.", messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Versand fehlgeschlagen";
    await prisma.externalEmailDraft.update({
      where: { id: draftId },
      data: { status: "send_failed", sendError: message },
    });
    return { sent: false, message };
  }
}
