import { ImapFlow } from "imapflow";
import { isE2eEmailMockEnabled } from "@/lib/e2e-email-mock";
import { oauthReconnectHint } from "@/server/integrations/calendar-oauth-health";
import { getCalendarConnection } from "@/server/integrations/calendar-connection";
import { getValidCalendarAccessToken } from "@/server/integrations/calendar-token";
import {
  decryptEmailAppPassword,
  getEmailConnection,
} from "@/server/integrations/email-connection";
import {
  ICLOUD_IMAP_HOST,
  ICLOUD_IMAP_PORT,
} from "@/server/integrations/icloud-constants";
import { listMicrosoftInboxMessages } from "@/server/integrations/microsoft-mail-read";

export type InboxProvider = "icloud" | "microsoft";

export type ExternalInboxMessage = {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  provider: InboxProvider;
};

export type ListExternalInboxResult = {
  connected: boolean;
  provider: InboxProvider | null;
  messages: ExternalInboxMessage[];
  message: string;
  readError?: string;
};

function mockIcloudInbox(): ExternalInboxMessage[] {
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

async function listICloudInboxMessages(
  limit: number,
): Promise<{ messages: ExternalInboxMessage[]; readError?: string }> {
  const conn = await getEmailConnection();
  if (!conn || conn.provider !== "icloud") {
    return { messages: [] };
  }

  if (isE2eEmailMockEnabled()) {
    return { messages: mockIcloudInbox() };
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
    try {
      await client.mailboxOpen("INBOX");
      const mailbox = client.mailbox;
      const total =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? (mailbox.exists ?? 0)
          : 0;
      if (total === 0) {
        return { messages: [] };
      }
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
      return { messages };
    } finally {
      lock.release();
    }
  } catch (err) {
    const readError = err instanceof Error ? err.message : "Posteingang lesen fehlgeschlagen";
    return { messages: [], readError: `iCloud: ${readError}` };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

function buildInboxMessage(providers: InboxProvider[], count: number): string {
  if (providers.length === 0) {
    return "Kein externer Posteingang verbunden — nur Nexo-Entwürfe sichtbar.";
  }
  const labels =
    providers.length === 1
      ? providers[0] === "microsoft"
        ? "Outlook"
        : "iCloud"
      : "Outlook und iCloud";
  if (count === 0) {
    return `Posteingang (${labels}) leer oder nicht geladen (read-only, kein Sync).`;
  }
  return `${count} Nachricht(en) aus ${labels} (read-only, kein Sync).`;
}

export async function listExternalInboxMessages(options?: {
  limit?: number;
}): Promise<ListExternalInboxResult> {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 25);
  const perSourceLimit = limit;

  if (isE2eEmailMockEnabled()) {
    const providers: InboxProvider[] = [];
    const merged: ExternalInboxMessage[] = [];
    const msConn = await getCalendarConnection("microsoft");
    if (msConn) {
      providers.push("microsoft");
      const ms = await listMicrosoftInboxMessages("e2e-token", perSourceLimit);
      merged.push(...ms.messages);
    }
    const icloudConn = await getEmailConnection();
    if (icloudConn?.provider === "icloud") {
      providers.push("icloud");
      merged.push(...mockIcloudInbox());
    }
    if (providers.length === 0) {
      return {
        connected: true,
        provider: "icloud",
        messages: mockIcloudInbox(),
        message: "Read-only Posteingang (E2E-Mock, kein Live-Abruf).",
      };
    }
    merged.sort((a, b) => b.date.localeCompare(a.date));
    return {
      connected: true,
      provider: providers.length === 1 ? providers[0]! : null,
      messages: merged.slice(0, limit),
      message: "Read-only Posteingang (E2E-Mock, kein Live-Abruf).",
    };
  }

  const activeProviders: InboxProvider[] = [];
  const errors: string[] = [];
  let merged: ExternalInboxMessage[] = [];

  const msConn = await getCalendarConnection("microsoft");
  const msAuth = await getValidCalendarAccessToken("microsoft");
  if (msConn) {
    activeProviders.push("microsoft");
    if (msAuth) {
      const ms = await listMicrosoftInboxMessages(msAuth.token, perSourceLimit);
      merged.push(...ms.messages);
      if (ms.readError) errors.push(ms.readError);
    } else {
      const hint = oauthReconnectHint("microsoft");
      if (hint) errors.push(hint);
    }
  }

  const icloudConn = await getEmailConnection();
  if (icloudConn?.provider === "icloud") {
    activeProviders.push("icloud");
    const icloud = await listICloudInboxMessages(perSourceLimit);
    merged.push(...icloud.messages);
    if (icloud.readError) errors.push(icloud.readError);
  }

  if (activeProviders.length === 0) {
    return {
      connected: false,
      provider: null,
      messages: [],
      message: "Kein externer Posteingang verbunden — iCloud Mail oder Microsoft-Kalender (Mail.Read) nötig.",
    };
  }

  merged.sort((a, b) => b.date.localeCompare(a.date));
  merged = merged.slice(0, limit);

  return {
    connected: true,
    provider: activeProviders.length === 1 ? activeProviders[0]! : null,
    messages: merged,
    message: buildInboxMessage(activeProviders, merged.length),
    readError: errors.length > 0 ? errors.join(" · ") : undefined,
  };
}
