import { ImapFlow } from "imapflow";
import { isE2eEmailMockEnabled } from "@/lib/e2e-email-mock";
import {
  decryptEmailAppPassword,
  getEmailConnection,
} from "@/server/integrations/email-connection";
import {
  ICLOUD_IMAP_HOST,
  ICLOUD_IMAP_PORT,
} from "@/server/integrations/icloud-constants";

export type ExternalInboxMessage = {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  provider: "icloud";
};

export type ListExternalInboxResult = {
  connected: boolean;
  provider: "icloud" | null;
  messages: ExternalInboxMessage[];
  message: string;
  readError?: string;
};

function mockInbox(): ExternalInboxMessage[] {
  return [
    {
      id: "e2e-mock-mail-1",
      subject: "E2E Mock-Nachricht",
      from: "sender@example.com",
      date: new Date().toISOString(),
      preview: "Read-only Vorschau (E2E-Mock).",
      provider: "icloud",
    },
  ];
}

export async function listExternalInboxMessages(options?: {
  limit?: number;
}): Promise<ListExternalInboxResult> {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 25);
  const conn = await getEmailConnection();
  if (!conn || conn.provider !== "icloud") {
    return {
      connected: false,
      provider: null,
      messages: [],
      message: "Kein iCloud-Mail-Konto verbunden — nur Nexo-Entwürfe sichtbar.",
    };
  }

  if (isE2eEmailMockEnabled()) {
    return {
      connected: true,
      provider: "icloud",
      messages: mockInbox(),
      message: "Read-only Posteingang (E2E-Mock, kein Live-Abruf).",
    };
  }

  const appleId = conn.accountEmail;
  const appPassword = decryptEmailAppPassword(conn);

  const client = new ImapFlow({
    host: ICLOUD_IMAP_HOST,
    port: ICLOUD_IMAP_PORT,
    secure: true,
    auth: { user: appleId, pass: appPassword },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let result: ListExternalInboxResult;
    try {
      await client.mailboxOpen("INBOX");
      const mailbox = client.mailbox;
      const total =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? (mailbox.exists ?? 0)
          : 0;
      if (total === 0) {
        result = {
          connected: true,
          provider: "icloud",
          messages: [],
          message: "Posteingang ist leer (read-only Vorschau).",
        };
      } else {
        const startSeq = Math.max(1, total - limit + 1);
        const messages: ExternalInboxMessage[] = [];
        for await (const msg of client.fetch(`${startSeq}:${total}`, {
          envelope: true,
          source: { start: 0, maxLength: 800 },
        })) {
          const subject = msg.envelope?.subject ?? "(Ohne Betreff)";
          const from =
            msg.envelope?.from?.map((a) => a.address ?? a.name ?? "").filter(Boolean).join(", ") ||
            "Unbekannt";
          const rawDate = msg.envelope?.date;
          const date =
            rawDate instanceof Date
              ? rawDate.toISOString()
              : typeof rawDate === "string"
                ? new Date(rawDate).toISOString()
                : new Date().toISOString();
          let preview = "";
          if (msg.source) {
            const text = msg.source.toString("utf8");
            const bodyMatch = text.match(/\r\n\r\n([\s\S]{0,400})/);
            preview = (bodyMatch?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
          }
          messages.push({
            id: String(msg.uid ?? msg.seq),
            subject,
            from,
            date,
            preview: preview || "—",
            provider: "icloud",
          });
          if (messages.length >= limit) break;
        }
        messages.reverse();
        result = {
          connected: true,
          provider: "icloud",
          messages,
          message:
            messages.length > 0
              ? `${messages.length} Nachricht(en) aus iCloud Posteingang (read-only, kein Sync).`
              : "Posteingang ist leer oder konnte nicht gelesen werden.",
        };
      }
    } finally {
      lock.release();
    }
    return result;
  } catch (err) {
    const readError = err instanceof Error ? err.message : "Posteingang lesen fehlgeschlagen";
    return {
      connected: true,
      provider: "icloud",
      messages: [],
      message: "iCloud Posteingang konnte nicht geladen werden.",
      readError,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
