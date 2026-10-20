import { isE2eCalendarMockEnabled } from "@/lib/e2e-calendar-mock";

export type MicrosoftInboxMessage = {
  id: string;
  subject: string;
  from: string;
  date: string;
  preview: string;
  provider: "microsoft";
};

export async function listMicrosoftInboxMessages(
  accessToken: string,
  limit: number,
): Promise<{ messages: MicrosoftInboxMessage[]; readError?: string }> {
  if (isE2eCalendarMockEnabled()) {
    void accessToken;
    return {
      messages: [
        {
          id: "e2e-mock-ms-mail-1",
          subject: "E2E Mock-Outlook",
          from: "outlook@nexo.test",
          date: new Date().toISOString(),
          preview: "Read-only Vorschau (E2E-Mock, Microsoft Graph).",
          provider: "microsoft",
        },
      ],
    };
  }

  const params = new URLSearchParams({
    $top: String(limit),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,from,receivedDateTime,bodyPreview",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      messages: [],
      readError: `Microsoft Graph (Mail): ${text.slice(0, 300)}`,
    };
  }

  const data = (await res.json()) as {
    value?: {
      id?: string;
      subject?: string;
      from?: { emailAddress?: { address?: string; name?: string } };
      receivedDateTime?: string;
      bodyPreview?: string;
    }[];
  };

  const messages: MicrosoftInboxMessage[] = (data.value ?? []).slice(0, limit).map((item) => {
    const fromAddr = item.from?.emailAddress;
    const from =
      fromAddr?.name && fromAddr?.address
        ? `${fromAddr.name} <${fromAddr.address}>`
        : fromAddr?.address ?? fromAddr?.name ?? "Unbekannt";
    return {
      id: item.id ?? "unknown",
      subject: item.subject ?? "(Ohne Betreff)",
      from,
      date: item.receivedDateTime ?? new Date().toISOString(),
      preview: (item.bodyPreview ?? "—").slice(0, 160),
      provider: "microsoft" as const,
    };
  });

  return { messages };
}
